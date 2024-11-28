export default function (err, req, res, next) {
  console.error(err);
  if (err.name === 'PrismaClientKnownRequestError') res.status(500).json({ errorMessage: 'DB 에러가 발생했습니다.' });

  return res.status(500).json({ errorMessage: '서버 내부 에러가 발생했습니다.' });
}
