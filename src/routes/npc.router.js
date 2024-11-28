import express from 'express';
import { prisma } from '../utils/prisma/index.js';
import authMiddleware from '../middlewares/auth.middleware.js';
import { Prisma } from '@prisma/client';

const router = express.Router();

/** 아이템 구입 API*/
router.post('/npc/:characterId', authMiddleware, async (req, res, next) => {
  try {
    const { characterId } = req.params;
    const { itemCode, count } = req.body;

    console.log(count);
    // 1. 입력 값 체크
    if (!itemCode) return res.status(400).json({ message: '구매할 아이템을 선택하지 않았습니다.' });
    if (count === 0) return res.status(400).json({ message: '구매 수량은 1 이상이어야 합니다. ' });

    // 1-2. 구매수량 정보 없으면 무조건 1로 처리
    const buyConut = count ? +count : 1;

    // 2. 캐릭터 정보 조회
    const character = await prisma.character.findFirst({ where: { characterId: +characterId } });
    if (!character) return res.status(404).json({ message: '해당 캐릭터는 존재하지 않습니다.' });

    // 3. 내 캐릭터 여부 체크
    const { accountId } = req.user;
    if (character.accountId !== +accountId) return res.status(401).json({ message: '접속한 계정의 캐릭터가 아니여서 구매할 수 없습니다.' });

    // 4. 해당 아이템 존재 여부 체크
    const item = await prisma.item.findFirst({ where: { itemCode: +itemCode } });
    if (!item) return res.status(404).json({ message: '존재하지 않는 아이템 입니다.' });

    // 5. 소지금 체크
    if (character.money < item.itemPrice * buyConut) return res.status(202).json({ message: '소지금이 부족하여 구매할 수 없습니다.' });

    // 6. 구매 처리
    // 6-1. 소지금 차감
    const myMoney = await prisma.$transaction(
      async (tx) => {
        const result = await tx.character.update({
          where: {
            characterId: +characterId,
          },
          data: {
            money: character.money - item.itemPrice * buyConut,
          },
        });

        //6. 인벤토리 처리
        //6-1. 해당 아이템을 보유중인지 확인
        const inventory = await tx.inventory.findFirst({ where: { characterId: +characterId, itemCode: itemCode } });

        //6-2. 있으면 수량 변경 없으면 생성
        if (!inventory) {
          await tx.inventory.create({
            data: {
              characterId: +characterId,
              itemCode: itemCode,
              qty: buyConut,
            },
          });
        } else {
          await tx.inventory.update({
            where: {
              inventoryId: inventory.inventoryId,
            },
            data: {
              qty: inventory.qty + buyConut,
            },
          });
        }

        return result.money;
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
      },
    );

    return res.status(200).json({ message: '아이템 구매에 성공하셨습니다.', money: myMoney });
  } catch (error) {
    next(error);
  }
});

/**** 아이템 판매 API*/
router.delete('/npc/:characterId', authMiddleware, async (req, res, next) => {
  try {
    const { characterId } = req.params;
    const { itemCode, count } = req.body;

    // 1. 입력 값 체크
    if (!itemCode) return res.status(400).json({ message: '구매할 아이템을 선택하지 않았습니다.' });
    if (count === 0) return res.status(400).json({ message: '판매 수량은 1 이상이어야 합니다. ' });

    // 1-2. 판매수량 정보 없으면 무조건 1로 처리
    const sellConut = count ? count : 1;

    // 2. 내 계정 여부 확인
    const { accountId } = req.user;
    const character = await prisma.character.findFirst({ where: { characterId: +characterId } });
    if (!character) return res.status(404).json({ message: '존재하지 않는 캐릭터 입니다.' });
    if (character.accountId !== accountId) return res.status(401).json({ message: '접속한 계정의 캐릭터가 아니여서 판매할 수 없습니다.' });

    // 3. 아이템 정보 조회
    const item = await prisma.item.findFirst({ where: { itemCode: +itemCode } });
    if (!item) return res.status(404).json({ message: '존재하지 않는 아이템 입니다.' });

    // 4. 인벤토리 처리
    // 4-1. 인벤토리에 해당 아이템 조회
    const inventory = await prisma.inventory.findFirst({ where: { itemCode: +itemCode, characterId: +characterId } });

    // 4-2. 보유하고 있지 않으면 return
    if (!inventory) return res.status(404).json({ message: '해당 아이템을 보유하고 있지 않습니다.' });

    // 4-3. 소지수량이 판매수량보다 부족하면 return
    if (inventory.qty < sellConut) return res.status(400).json({ message: `수량이 부족하여 처리 할 수 없습니다. (보유 수량: ${inventory.qty})` });

    const myMoney = await prisma.$transaction(
      async (tx) => {
        // 4-4. 판매 처리(판매 후 수량 남으면 수정 qty=0 삭제)
        if (inventory.qty - sellConut > 0) {
          await tx.inventory.update({ where: { inventoryId: inventory.inventoryId }, data: { qty: inventory.qty - sellConut } });
        } else {
          await tx.inventory.delete({ where: { inventoryId: inventory.inventoryId } });
        }

        const result = await tx.character.update({ where: { characterId: +characterId, accountId }, data: { money: character.money + item.itemPrice * 0.6 * sellConut } });

        return result.money;
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
      },
    );

    return res.status(200).json({ message: '아이템 판매에 성공하셨습니다.', money: myMoney });
  } catch (error) {
    next(error);
  }
});

export default router;
