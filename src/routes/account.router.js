import express from 'express';
import { prisma } from '../utils/prisma/index.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();
const router = express.Router();

/***
 * 회원가입
 */

router.post('/account', async (req, res, next) => {
  try {
    // 1. 입력 갑 받아오기
    const { userId, userPw, userPwChk } = req.body;

    // 2. 아이디, 비밀번호 입력 값 없으면 오류 MSG
    if (!userId) return res.status(400).json({ message: '아이디는 필수 입력 입니다.' });
    if (!userPw) return res.status(400).json({ message: '비밀번호는 필수 입력 입니다.' });
    if (!userPwChk) return res.status(400).json({ message: '비밀번호 확인은 필수 입력 입니다.' });

    // 3. 유효성 체크
    // 3-1. 아이디 (영어 소문자 + 숫자 조합)
    const regex = /^[0-9a-z]+$/;
    if (!regex.test(userId)) return res.status(401).json({ message: "아이디는 '영어 소문자 + 숫자' 조합 으로 입력 바랍니다." });

    // 3-2. 아이디 (다른 사용자와 중복 체크)
    const isAlready = await prisma.account.findFirst({ where: { userId } });
    if (isAlready) return res.status(409).json({ message: '이미 존재하는 아이디 입니다.' });

    // 3-3. 비밀번호 (최소 6자 이상)
    if (userPw.length < 6) return res.status(401).json({ message: '비밀번호는 6자 이상 이어야 합니다.' });

    // 3-4. 비밀번호와 비밀번호 확인 값 일치 여부
    if (userPw !== userPwChk) return res.status(401).json({ message: '비밀번호 확인이 비밀번호와 불일치 합니다.' });

    // 4. 비밀번호 암호화 처리
    const hashPassword = await bcrypt.hash(userPw, 10);

    // 5. 저장
    const save = await prisma.account.create({
      data: {
        userId,
        userPw: hashPassword,
      },
    });

    // 6. 비밀번호를 제외 한 사용자의 정보를 반환
    return res.status(201).json({ accountId: save.accountId, userId: save.userId, createDt: save.createDt });
  } catch (error) {
    next(error);
  }
});

/***
 * 로그인
 */

router.post('/login', async (req, res, next) => {
  try {
    const { userId, userPw } = req.body;

    // 1. 입력 값 체크
    if (!userId) return res.status(400).json({ message: '아이디는 필수 입력 입니다.' });
    if (!userPw) return res.status(400).json({ message: '비밀번호는 필수 입력 입니다.' });

    // 2. 데이터 조회
    const user = await prisma.account.findFirst({
      where: {
        userId,
      },
    });

    // 3. 아이디가 존재하지 않는 경우
    if (!user) return res.status(404).json({ message: '존재하지 않는 아이디 입니다.' });

    // 4. 아이디는 존재하는데 비밀번호가 틀리는 경우
    if (!(await bcrypt.compare(userPw, user.userPw))) return res.status(401).json({ message: '비밀번호가 일치하지 않습니다.' });

    // 5. 로그인 성공
    // 5-1. 엑세스 토큰을 생성하여 반환 (엑세스 토큰의 Payload는 로그인 한 계정의 ID)
    const token = jwt.sign({ accountId: user.accountId }, process.env.ACCESS_TOKEN_SECRET_KEY);

    res.cookie('accessToken', `Bearer ${token}`, { expiresIn: '30s' });
    return res.status(200).json('로그인 성공');
  } catch (error) {
    next(error);
  }
});

export default router;
