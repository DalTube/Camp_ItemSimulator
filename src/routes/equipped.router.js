import express from 'express';
import { prisma } from '../utils/prisma/index.js';
import authMiddleware from '../middlewares/auth.middleware.js';

const router = express.Router();

/**** 캐릭터 장착한 아이템 목록 조회 */
router.get('/equipped/:characterId', async (req, res, next) => {
  try {
    const { characterId } = req.params;

    // characterId 정합성 체크
    const regix = /^[0-9]+$/;
    if (!regix.test(characterId)) return res.status(400).json({ message: '잘못된 캐릭터 정보 입니다.' });

    // 캐릭터 존재 여부
    const character = await prisma.character.findFirst({ where: { characterId: +characterId } });
    if (!character) return res.status(404).json({ message: '캐릭터가 존재하지 않습니다.' });

    // 장착 테이블 조회
    return res.status(200).json(await getEquippedInfo(+characterId));
  } catch (error) {
    next(error);
  }
});

/*** 아이템 장착 API */
router.patch('/equipped/:characterId/puton', authMiddleware, async (req, res, next) => {
  try {
    const { characterId } = req.params;
    const { itemCode } = req.body;
    const { accountId } = req.user;

    // characterId 정합성 체크
    const regix = /^[0-9]+$/;
    if (!regix.test(characterId)) return res.status(400).json({ message: '잘못된 캐릭터 정보입니다.' });

    // 캐릭터 존재 여부
    const character = await prisma.character.findFirst({ where: { characterId: +characterId } });
    if (!character) return res.status(404).json({ message: '캐릭터가 존재하지 않습니다.' });

    // 계정 내 캐릭터인지 체크
    if (accountId !== character.accountId) return res.status(401).json({ message: '다른 계정의 캐릭터로 수행할 수 없습니다.' });

    // 아이템 존재 여부 체크
    const item = await prisma.item.findFirst({ where: { itemCode } });
    if (!item) return res.status(404).json({ message: '존재하지 않는 아이템입니다.' });

    // 아이템 유형이 0이면 장착x (일반 아이템은 장착 할 수 없다.)
    if (item.itemType === 0) return res.status(401).json({ message: '일반 아이템은 장착할 수 없습니다.' });

    // 내 인벤토리 체크
    const inventory = await prisma.inventory.findFirst({ where: { itemCode, characterId: +characterId } });
    if (!inventory) return res.status(404).json({ message: '인벤토리에 없는 아이템입니다.' });

    // 장비 장착 상태 조회
    const equipped = await prisma.equipped.findFirst({ where: { characterId: +characterId } });

    let isChageEquipment = false; //교체 여부
    let isPutOnEquipment = false; //없는 부위에 장착 여부
    let updateData = {};
    let equippedItemCode = 0; //장착중인 아이템 코드

    //아이템 유형에 따른 updateData 가공 로직
    switch (item.itemType) {
      case 1:
        //같은 장비
        if (equipped.weaponCode && equipped.weaponCode === String(itemCode)) return res.status(401).json({ message: '이미 장착한 아이템 입니다.' });
        //다른장비
        else if (equipped.weaponCode && equipped.weaponCode !== String(itemCode)) {
          isChageEquipment = true; //교체
          equippedItemCode = equipped.weaponCode;
        } else isPutOnEquipment = true; //장착

        updateData.weaponCode = String(item.itemCode);
        updateData.weaponName = item.itemName;
        break;
      case 2:
        //같은 장비
        if (equipped.headCode && equipped.headCode === String(itemCode)) return res.status(401).json({ message: '이미 장착한 아이템 입니다.' });
        //다른장비
        else if (equipped.headCode && equipped.headCode !== String(itemCode)) {
          isChageEquipment = true;
          equippedItemCode = equipped.headCode;
        } else isPutOnEquipment = true; //장착

        updateData.headCode = String(item.itemCode);
        updateData.headName = item.itemName;
        break;
      case 3:
        //같은 장비
        if (equipped.bodyCode && equipped.bodyCode === String(itemCode)) return res.status(401).json({ message: '이미 장착한 아이템 입니다.' });
        //다른장비
        else if (equipped.bodyCode && equipped.bodyCode !== String(itemCode)) {
          isChageEquipment = true;
          equippedItemCode = equipped.bodyCode;
        } else isPutOnEquipment = true; //장착

        updateData.bodyCode = String(item.itemCode);
        updateData.bodyName = item.itemName;
        break;
      case 4:
        //같은 장비
        if (equipped.shoesCode && equipped.shoesCode === String(itemCode)) return res.status(401).json({ message: '이미 장착한 아이템 입니다.' });
        //다른장비
        else if (equipped.shoesCode && equipped.shoesCode !== String(itemCode)) {
          isChageEquipment = true;
          equippedItemCode = equipped.shoesCode;
        } else isPutOnEquipment = true; //장착

        updateData.shoesCode = String(item.itemCode);
        updateData.shoesName = item.itemName;
        break;
      case 5:
        //같은 장비 (악세1,2 체크)
        if ((equipped.accessoryLeftCode && equipped.accessoryLeftCode === String(itemCode)) || (equipped.accessoryRightCode && equipped.accessoryRightCode === String(itemCode))) {
          return res.status(401).json({ message: '이미 장착한 아이템 입니다.' });
        } else if (equipped.accessoryLeftCode && equipped.accessoryLeftCode !== String(itemCode) && equipped.accessoryRightCode && equipped.accessoryRightCode !== String(itemCode)) {
          isChageEquipment = true;
          equippedItemCode = equipped.accessoryLeftCode;

          //둘다 없는 악세 장착인 경우 left에 교체
          updateData.accessoryLeftCode = String(item.itemCode);
          updateData.accessoryLeftName = item.itemName;
        } else {
          //어느 한곳이 비어 있음
          isPutOnEquipment = true;

          if (!equipped.accessoryLeftCode) {
            updateData.accessoryLeftCode = String(item.itemCode);
            updateData.accessoryLeftName = item.itemName;
          } else if (!equipped.accessoryRightCode) {
            updateData.accessoryRightCode = String(item.itemCode);
            updateData.accessoryRightName = item.itemName;
          }
        }
        break;
      default:
        break;
    }

    await prisma.$transaction(async (tx) => {
      // 장비 장착 테이블 처리
      await tx.equipped.update({ where: { equippedId: equipped.equippedId, characterId: +characterId }, data: updateData });

      //캐릭터 STAT 처리
      if (isChageEquipment) {
        //교체
        if (isChageEquipment) {
          const equippedItem = await prisma.item.findFirst({ where: { itemCode: +equippedItemCode } });
          await tx.character.update({
            where: { characterId: +characterId },
            data: { health: character.health - equippedItem.health + item.health, power: character.power - equippedItem.power + item.power },
          });

          // 인벤토리 테이블 처리 (교체할 아이템)
          const equippedInventory = await tx.inventory.findFirst({ where: { itemCode: equippedItem.itemCode, characterId: +characterId } });
          if (!equippedInventory) {
            await tx.inventory.create({
              data: {
                itemCode: equippedItem.itemCode,
                qty: 1,
                characterId: +characterId,
              },
            });
          } else {
            //업데이트
            await tx.inventory.update({
              where: { inventoryId: equippedInventory.inventoryId },
              data: {
                qty: equippedInventory.qty++,
              },
            });
          }

          // 인벤토리 테이블 처리 (장착할 아이템)
          if (inventory.qty > 1) {
            //업데이트
            await tx.inventory.update({
              where: { inventoryId: inventory.inventoryId },
              data: {
                qty: inventory.qty - 1,
              },
            });
          } else {
            //삭제
            await tx.inventory.delete({
              where: { inventoryId: inventory.inventoryId },
            });
          }
        } else if (isPutOnEquipment) {
          await tx.character.update({ where: { characterId: +characterId }, data: { health: character.health + item.health, power: character.power + item.power } });

          // 인벤토리 테이블 처리
          if (inventory.qty > 1) {
            //업데이트
            await tx.inventory.update({
              where: { inventoryId: inventory.inventoryId },
              data: {
                qty: inventory.qty--,
              },
            });
          } else {
            //삭제
            await tx.inventory.delete({
              where: { inventoryId: inventory.inventoryId },
            });
          }
        }
      }
    });

    // 결과
    return res.status(201).json({ message: `${item.itemName}을 장착 하셨습니다.` });
  } catch (error) {
    if (error.name === 'Error') {
      await prisma.equipped.create({
        data: {
          characterId: +req.params.characterId,
        },
      });
      // createEquippedData(+req.params.characterId); //Equipped 데이터 재생성
      return res.status(500).json({ errorMessage: '데이터 미생성 오류. 데이터를 다시 생성합니다. 재요청 바랍니다.' });
    }
    next(error);
  }
});

/*** 아이템 탈착 API */
router.patch('/equipped/:characterId/takeoff', authMiddleware, async (req, res, next) => {
  try {
    const { characterId } = req.params;
    const { accountId } = req.user;
    const { itemCode } = req.body;

    // characterId 정합성 체크
    const regix = /^[0-9]+$/;
    if (!regix.test(characterId)) return res.status(400).json({ message: '잘못된 캐릭터 정보입니다.' });

    // 캐릭터 존재 여부
    const character = await prisma.character.findFirst({ where: { characterId: +characterId } });
    if (!character) return res.status(404).json({ message: '캐릭터가 존재하지 않습니다.' });

    // 계정 내 캐릭터인지 체크
    if (accountId !== character.accountId) return res.status(401).json({ message: '다른 계정의 캐릭터로 수행할 수 없습니다.' });

    // 아이템 유형이 0이면 탈착x (일반 아이템은 장착 할 수 없다.)
    if (item.itemType === 0) return res.status(401).json({ message: '일반 아이템은 장착할 수 없습니다.' });

    // 내 인벤토리 체크
    // const inventory = await prisma.inventory.findFirst({ where: { itemCode, characterId: +characterId } });
    // if (!inventory) return res.status(404).json({ message: '인벤토리에 없는 아이템입니다.' });

    // 장비 장착 상태 조회
    const equipped = await prisma.equipped.findFirst({ where: { characterId: +characterId } });

    if (!equipped.weaponCode && +equipped.weaponCode === itemCode) await prisma.equipped.update({ where: { weaponCode: null, weaponName: null } });
    if (!equipped.headCode && +equipped.headCode === itemCode) await prisma.equipped.update({ where: { headCode: null, headName: null } });
    if (!equipped.bodyCode && +equipped.bodyCode === itemCode) await prisma.equipped.update({ where: { bodyCode: null, bodyName: null } });
    if (!equipped.shoesCode && +equipped.shoesCode === itemCode) await prisma.equipped.update({ where: { shoesCode: null, shoesName: null } });
    if (!equipped.accessoryLeftCode && +equipped.accessoryLeftCode === itemCode) await prisma.equipped.update({ where: { accessoryLeftCode: null, accessoryLeftName: null } });
    if (!equipped.accessoryRightCode && +equipped.accessoryRightCode === itemCode) await prisma.equipped.update({ where: { accessoryRightCode: null, accessoryRightName: null } });

    // 결과
    return res.status(201).json(await prisma.character.findFirst({ where: { characterId: +characterId, accountId }, select: { money: true } }));
  } catch (error) {}
});

/**** 캐릭터 장비테이블 상세 */
// const getEquippedInfo = (characterId) => {
//   return prisma.$queryRaw`SELECT A.equipped_id, A.character_id
//   , A.weapon_code, B.item_name AS weapon_name
//   , A.head_code, C.item_name AS head_name
//   , A.body_code, D.Item_name AS body_name
//   , A.shoes_code, E.Item_name AS shoes_name
//   , A.accessory_left_code, F.Item_name AS accessory_left_name
//   , A.accessory_right_code, G.Item_name AS accessory_right_name
//   FROM Equipped A
//   LEFT OUTER JOIN Item B ON A.weapon_code = B.item_code
//   LEFT OUTER JOIN Item C ON A.head_code = C.item_code
//   LEFT OUTER JOIN Item D ON A.body_code = D.item_code
//   LEFT OUTER JOIN Item E ON A.shoes_code = E.item_code
//   LEFT OUTER JOIN Item F ON A.accessory_left_code = F.item_code
//   LEFT OUTER JOIN Item G ON A.accessory_right_code  = G.item_code
//   WHERE A.character_id = ${characterId}`;
// };

export default router;
