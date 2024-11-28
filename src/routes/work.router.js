import express from 'express';
import { prisma } from '../utils/prisma/index.js';
import authMiddleware from '../middlewares/auth.middleware.js';

const router = express.Router();

router.patch('/work/:characterId', authMiddleware, async (req, res, next) => {
  try {
    const { characterId } = req.params;
    const { accountId } = req.user;

    // characterId 정합성 체크
    const regix = /^[0-9]+$/;
    if (!regix.test(characterId)) return res.status(400).json({ message: '잘못된 캐릭터 정보 입니다.' });

    // 캐릭터 존재 여부
    const character = await prisma.character.findFirst({ where: { characterId: +characterId } });
    if (!character) return res.status(404).json({ message: '캐릭터가 존재하지 않습니다.' });

    // 계정 내 캐릭터인지 체크
    if (accountId !== character.accountId) return res.status(401).json({ message: '다른 계정의 캐릭터로 일을 할 수 없습니다.' });

    // 소지금 수정
    await prisma.character.update({ where: { characterId: +characterId }, data: { money: character.money + 100 } });

    // 결과
    return res.status(201).json(await prisma.character.findFirst({ where: { characterId: +characterId, accountId }, select: { money: true } }));
  } catch (error) {}
});

export default router;
