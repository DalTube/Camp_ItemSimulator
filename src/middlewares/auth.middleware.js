import jwt from 'jsonwebtoken';
import { prisma } from '../utils/prisma/index.js';

export default async function (req, res, next) {
  try {
    const { accessToken } = req.cookies;
    if (!accessToken) throw new Error('토큰이 존재하지 않습니다.');

    const [tokenType, token] = accessToken.split(' ');

    // 1. Bearer토큰 형태 체크
    if (tokenType !== 'Bearer') throw new Error('토큰 타입이 일치하지 않습니다.');

    const decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET_KEY);
    const accountId = decodedToken.accountId;

    // 2. 유저 정보 조회
    const account = await prisma.account.findFirst({
      where: { accountId: +accountId },
    });
    if (!account) {
      res.clearCookie('accessToken'); //쿠키 초기화
      throw new Error('토큰 사용자가 존재하지 않습니다.');
    }

    req.user = decodedToken;

    next();
  } catch (error) {
    res.clearCookie('accessToken');

    // 토큰이 만료되었거나, 조작되었을 때, 에러 메시지를 다르게 출력합니다.
    switch (error.name) {
      case 'TokenExpiredError':
        return res.status(401).json({ message: '토큰이 만료되었습니다.' });
      case 'JsonWebTokenError':
        return res.status(401).json({ message: '토큰이 조작되었습니다.' });
      default:
        return res.status(401).json({ message: error.message ?? '비정상적인 요청입니다.' });
    }
  }
}
