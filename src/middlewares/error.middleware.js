export default function (err, req, res, next) {
  console.error(err);
  return res.status(500).json({ errorMessage: '서버 내부 에러가 발생했습니다.' });
}
