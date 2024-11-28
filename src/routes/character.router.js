import express from 'express';
import { prisma } from '../utils/prisma/index.js';
import authMiddleware from '../middlewares/auth.middleware.js';

const router = express.Router();

/**** 캐릭터 생성 API */
router.post('/character', authMiddleware, async (req, res, next) => {
  const { characterName } = req.body;
  const { accountId } = req.user;

  try {
    // 1. 입력 값 체크
    if (!characterName) return res.status(401).json({ message: '캐릭터 명은 필수 입력 입니다.' });

    // 2. 이미 존재하는 캐릭터 명 인지 체크
    const character = await prisma.character.findFirst({
      where: {
        characterName,
      },
    });

    if (character) return res.status(401).json({ message: '이미 존재하는 캐릭터 명 입니다.' });

    // 3. 캐릭터 정보 테이블 생성
    const characterInfo = await prisma.character.create({
      data: {
        accountId: +accountId,
        characterName,
        health: 500,
        power: 100,
        money: 10000,
      },
    });

    // 4. 장비 장착 테이블 생성
    await prisma.equipped.create({
      data: {
        characterId: characterInfo.characterId,
      },
    });

    return res.status(200).json({ message: '캐릭터 생성 성공' });
  } catch (error) {
    next(error);
  }
});

/**** 캐릭터 삭제 API */
router.delete('/character/:characterId', authMiddleware, async (req, res, next) => {
  try {
    const { characterId } = req.params;
    const { accountId } = req.user;

    // 1. 삭제 대상 캐릭터 조회
    const character = await prisma.character.findFirst({
      where: {
        characterId: +characterId,
      },
    });

    // 1-1. 삭제할 데이터 없음
    if (!character) return res.status(404).json({ message: '해당 캐릭터를 찾을 수 없습니다.' });

    // 1-2. 내 계정 외의 캐릭터를 삭제 할려고 하는 경우
    if (+accountId !== character.accountId) return res.status(404).json({ message: '해당 캐릭터를 삭제할 수 있는 권한이 없습니다.' });

    // 2. 삭제
    await prisma.character.delete({
      where: {
        accountId: +accountId,
        characterId: +characterId,
      },
    });

    return res.status(200).json({ message: '캐릭터가 삭제되었습니다.' });
  } catch (error) {
    next();
  }
});

/**** 캐릭터 조회 API */
router.get('/character/:characterId', authMiddleware, async (req, res, next) => {
  try {
    const { characterId } = req.params;
    const { accountId } = req.user;

    // 1. 캐릭터 조회
    const character = await prisma.character.findFirst({
      where: {
        characterId: +characterId,
      },
    });
    if (!character) return res.status(404).json({ message: '존재하지 않는 캐릭터 입니다.' });

    // 2. 나의 캐릭터인지 아닌지에 따른 분기
    if (+accountId !== character.accountId) return res.status(200).json({ name: character.characterName, health: character.health, power: character.power });
    else return res.status(200).json({ name: character.characterName, health: character.health, power: character.power, money: character.money });
  } catch (error) {
    next();
  }
});

/**** 캐릭터 인벤토리 조회 API */
router.get('/character/:characterId/inventory', authMiddleware, async (req, res, next) => {
  try {
    const { characterId } = req.params;
    const { accountId } = req.user;

    // characterId 정합성 체크
    const regix = /^[0-9]+$/;
    if (!regix.test(characterId)) return res.status(400).json({ message: '잘못된 캐릭터 정보 입니다.' });

    // 캐릭터 존재 여부
    const character = await prisma.character.findFirst({ where: { characterId: +characterId, accountId } });
    if (!character) return res.status(404).json({ message: '캐릭터가 존재하지 않습니다.' });

    // 계정 내 캐릭터인지 체크
    if (accountId !== character.accountId) return res.status(401).json({ message: '다른 계정의 인벤토리 정보를 조회할 수 없습니다.' });

    // 인벤토리 조회
    const inventories = await prisma.inventory.findMany({
      where: { characterId: +characterId },
      select: {
        itemCode: true,
        qty: true,
        item: {
          select: {
            itemCode: true,
            itemName: true,
          },
        },
      },
    });

    if (!inventories) return res.status(200).json({ message: '아무것도 보유하고 있지 않습니다.' });
    else return res.status(200).json(inventories);
  } catch (error) {
    next(error);
  }
});
export default router;
