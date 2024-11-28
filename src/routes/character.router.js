import express from 'express';
import { prisma } from '../utils/prisma/index.js';
import authMiddleware from '../middlewares/auth.middleware.js';

const router = express.Router();

/***
 * 캐릭터 생성
 */
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

/***
 * 캐릭터 삭제
 */
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

/***
 * 캐릭터 조회
 */

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
export default router;
