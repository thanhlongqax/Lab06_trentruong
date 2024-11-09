//kiem tra dang nhap
function requireLogin(req, res, next) {
    if (req.session && req.session.user) {
        return next();
    } else {
        req.flash('error_msg', 'Bạn cần đăng nhập trước.');
        return res.redirect('/login');
    }
}
module.exports = {
    requireLogin
};