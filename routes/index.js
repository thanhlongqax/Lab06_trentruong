var express = require('express');
var router = express.Router();
const multer = require('multer');
const path = require('path');
const {requireLogin} = require('../utils/login_utils')
const bcrypt = require('bcrypt');
var csrf = require('csurf')
var csrfProtection = csrf({ cookie: true })
const Album = require('../schema/album');
const Photo = require('../schema/photo');
const User = require('../schema/user');
const { body, validationResult } = require('express-validator');
const saltRounds = 10;
router.use('/uploads', express.static(path.join(__dirname, 'uploads')));
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, './uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  },
});
const upload = multer({ storage });

// Endpoint uploads file
router.post('/upload', upload.single('file'), (req, res) => {
  try {
    // Kiểm tra nếu file không tồn tại
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }
    const fileUrl = `/uploads/${req.file.filename}`;
    try {
      // Lưu ảnh vào cơ sở dữ liệu
      const newPhoto = new Photo({ url: fileUrl });
      await newPhoto.save();

      res.json({ url: fileUrl, photoId: newPhoto._id });
    } catch (error) {
      res.status(500).json({ error: 'Error saving photo to database' });
    }
    res.status(200).json({
      message: 'File uploaded successfully',
      url: `uploads/${req.file.filename}`
    });
  } catch (error) {
    res.status(500).json({ message: 'File uploads failed', error });
  }
});

//
//trang dang nhap
router.get('/login', csrfProtection, function (req, res, next) {
  return res.render('login', { title: 'Đăng nhập', csrfToken: req.csrfToken() })
});
// Xử lý đăng nhập
router.post('/login',[
  body('username').notEmpty().withMessage('Vui lòng nhập username'),
  body('password').notEmpty().withMessage('Vui lòng nhập password')
], async (req, res, next) =>
{
  const { username, password ,rememberMe } = req.body;
  if (!username ) {
    req.flash('error_msg', 'Vui lòng nhập username ');
    return res.redirect('/login');
  }
  if (!password) {
    req.flash('error_msg', 'Vui lòng nhập password');
    return res.redirect('/login');
  }

  const user = await User.findOne({ username });
  if (!user) {
    req.flash('error_msg', 'Sai tên người dùng hoặc mật khẩu');
    return res.redirect('/login');
  }

  // So sánh mật khẩu
  bcrypt.compare(password, user.password, (err, match) => {
    if (err) {
      req.flash('error_msg', 'Sai tên người dùng hoặc mật khẩu');
      return res.redirect('/login');
    }
    if (match) {
      req.session.user = {
        id: user._id,
        username: user.username,
        email: user.email
      };
      if (rememberMe) {
        res.cookie('username', user.username, { maxAge: 900000, httpOnly: false });
      }
      req.flash('success_msg', 'Đăng nhập thành công!');
      return res.redirect('/');
    } else {
      req.flash('error_msg', 'Sai tên người dùng hoặc mật khẩu');
      return res.redirect('/login');
    }
  });
});
// dang xuat
router.get('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).send('Error logging out');
    }
    res.redirect('/login');
  });
});
//trang dang ky
router.get('/register',csrfProtection, function (req, res, next) {
  return res.render('register', { title: 'Đăng ký', csrfToken: req.csrfToken() })
});
// Xử lý đăng ký
router.post('/register',[
  body('username').notEmpty().withMessage('Username is required'),
  body('email').isEmail().withMessage('Email is invalid'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
] ,async (req, res, next) =>
{
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  const { username, email, password, confirmPassword } = req.body;
  if (password !== confirmPassword) {
    req.flash('error_msg', 'Confirm Password không trùng khớp Password. Vui lòng nhập lại !');
    return res.redirect('/register');
  }

  // Kiểm tra xem username đã tồn tại chưa
  const existingUser = await User.findOne({ username });
  if (existingUser) {
    req.flash('error_msg', 'Tên người dùng đã tồn tại. Vui lòng chọn tên khác!');
    return res.redirect('/register');
  }
  const existingEmail = await User.findOne({ email });
  if (existingEmail) {
    req.flash('error_msg', 'Email đã tồn tại. Vui lòng chọn tên khác!');
    return res.redirect('/register');
  }
  bcrypt.hash(password, saltRounds, async function (err, hash) {
    if (err) {
      console.error('Error hashing password:', err); // Log lỗi
      return res.status(500).send('Lỗi hasing password');
    }
    const newUser = new User({ username, email, password: hash });
    await newUser.save();
    req.flash('success_msg', 'Đăng ký tài khoản thành công!');
    return res.redirect('/login');
  });
});
//

router.use('/images', express.static('public/images'));

// Route: Tạo album
router.post('/album/create',requireLogin, async (req, res) => {
  const { albumName ,imageUrl  } = req.body;
  const userId = req.session.user.id;

  const album = new Album({ title : albumName,pho, userId });
  await album.save();
  return res.status(200).json({success : true , message : "tạo album thành công"})
});
// Xóa album
router.delete('/album/delete/:id', async (req, res) => {
  const { id } = req.params;
  await Album.destroy({ where: { album_id: id } });
  return res.status(200).json({ success: true });
});
// Route: Trang chủ để chọn album
router.get(['/', '/albums'], async (req, res) => {
  try {
    const albums = await Album.find().populate({
      path: 'photos',
      options: { limit: 4 }
    });
    res.render('albums', { albums });
  } catch (error) {
    console.error(error);
    return res.status(500).send('Lỗi server');
  }
});
module.exports = router;
