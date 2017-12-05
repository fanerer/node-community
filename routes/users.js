var express = require('express');
var router = express.Router();

var User = require('../models/user.js')
var secure = require('../modules/secure.js');
var config = require('../modules/config.js');
var check = require('../modules/check.js');
var formidable = require('formidable');
var fs = require('fs');

//进入注册页面的接口(必须是非登录过状态才可进入)
router.get('/register', check.logined, function (req, res, next) {
  res.render('users/register.ejs', {
    title: '注册',
    user: req.session.user
  });
})
// 注册接口,点击注册按钮进入该接口
router.post('/register', check.logined, function (req, res, next) {
  var name = req.body.name;
  var email = req.body.email;
  var password = req.body.password;
  // 1. 服务器端验证
  if (!name || !email || !password) {
    res.json({ code: 201, message: '输入的数据不合法！' });
    return;
  }
  // 2. 保存到数据库
  password = secure.encrypt(password, config.key)
  User.register({ name, email, password }, function (err, result) {
    if (err) {
      res.json({ code: 201, message: err.message });
      return;
    }

    // console.log(result); // result[0]
    req.session.user = result[0];
    req.session.save();
    res.json({ code: 200, message: '注册成功' });
  })

})

//进入登录页面的接口(必须是非登录状态)
router.get('/login', check.logined, function (req, res, next) {
  res.render('users/login.ejs', {
    title: '登录',
    user: req.session.user
  });
})
//登录接口,点击登录按钮进入该接口
router.post('/login', check.logined, function (req, res, next) {
  var name = req.body.name;
  var password = req.body.password;
  password = secure.encrypt(password, config.key);

  User.login({ account: name, password }, function (err, result) {
    if (err) {
      res.json({ code: 201, message: err.message });
      return;
    }
    // console.log(result); // result.result

    req.session.user = result.result;
    req.session.save();
    res.json({ code: 200, message: '登录成功' });
  })
})

// 退出接口
router.get('/logout', check.login, function (req, res, next) {
  req.session.destroy();  //把session销毁
  res.clearCookie('account');   //清除cookie   
  res.redirect('/users/login');
})

// 进入忘记密码接口页面
router.get('/forget', check.logined, function (req, res, next) {
  res.render('users/forget.ejs', {
    title: '忘记密码',
    user: req.session.user
  })
})
// 忘记密码接口,点击发送邮件按钮进入该接口
router.post('/forget', check.logined, function (req, res, next) {
  User.forget({ email: req.body.email }, function (err, result) {
    if (err) {
      res.json({ code: 201, message: err.message });
      return;
    }
    res.json(result);
  })
})

router.get('/success', check.logined, function (req, res, next) {
  res.render('users/success', {
    title: '确认邮件',
    user: req.session.user
  });
})

router.get('/reset', check.logined, function (req, res, next) {
  var email = req.query.email; // 3b2b2603a0b076bfb624b6960c1495a8
  try {
    email = secure.decrypt(email, config.key); // ddy_dhj@163.com
    res.render('users/reset', {
      title: '重置密码',
      user: req.session.user,
      email
    });
  } catch (error) {
    res.render('error.ejs', {
      title: '错误页',
      message: '服务器拒绝访问，原因：非法访问',
      error: { status: 403, stack: '非法访问！' },
      user: req.session.user
    });
  }
})

router.post('/reset', check.logined, function (req, res, next) {
  var email = req.body.email;
  var password = req.body.password;
  password = secure.encrypt(password, config.key);
  User.reset({ email, password }, function (err, result) {
    if (err) {
      res.json({ code: 201, message: err.message });
      return;
    }
    res.json({ code: 200, message: '重置成功！' });
  })
})

// 个人设置的接口
router.get('/setting', check.login, function (req, res, next) {
  res.render('users/setting.ejs', {
    title: '个人设置',
    user: req.session.user
  })
})

// 个人设置保存的接口
router.post('/setting', check.login, function (req, res, next) {
  var comments = req.body.comments;
  // {new: true}返回的结果是更新后的结果,否则是更新前的结果，默认是false
  var updateUser = User.findByIdAndUpdate(req.session.user._id, { comments }, {new: true});

  Promise.all([updateUser]).then(function (results) {
    req.session.user = results[0];
    req.session.save();
    res.json({ code: 200, message: results });
  }).catch(function (err) {
    res.json({ code: 201, message: err });
  })
})

//用来处理上传图片的逻辑  百度上传
router.post('/upload', check.login, function(req, res, next){
  var form = new formidable.IncomingForm();
  form.encoding = 'utf-8';
  form.uploadDir = "public/images/uploadstmp";   //先放在临时文件夹下
  form.keepExtensions = true;   //保留上传图片的后缀名
  //field事件中可以获取form表单传递过来的key/value
  // form.on('field', function(name, value) {
  //   // console.log(name + '|' + value);
  // });
  //file 上传文件事件
  form.on('file', function(name, file) {
    // console.log(file);
    var newFileName = req.session.user.name + '.' + file.name.split('.')[1];
    var newFilePath = 'public/images/uploads/' + newFileName;
    // console.log(newFilePath);
    fs.rename(file.path, newFilePath);
    var uploadLogo = User.findByIdAndUpdate(
      req.session.user._id,
      {logo: '/images/uploads/' + newFileName},
      {new: true},
      function(err, user){
        if(err){
          return res.json({code: 201, message: '上传失败！'});
        }
        req.session.user = user;
        req.session.save();   //save()用来保存session
      }
    )
  });
   // 监听上传出错事件 
  // form.on('error', function (err) {
  //   console.log(err);
  // });
  form.parse(req);   //让客户端解析发送过来的
  res.json({code: 200, message: '上传成功！'});
})

// jquery uploadify上传
router.post('/jupload', function (req, res, next) {
  var form = new formidable.IncomingForm();
  form.encoding = 'utf-8';
  form.uploadDir = "public/images/uploadstmp";
  form.keepExtensions = true;

  // fields对象用来保存客户端发送过来的key/value
  // files对象用来保存
  var fields = {}, files = {};
  form.on('field', function (name, value) {
    fields[name] = value;
  });

  form.on('file', function (name, file) {
    files[name] = file;
  });
  form.parse(req, function (err, fields, files) {
    console.log(files);
    console.log(fields);
    if (err) {
      console.log('formidabel error : ' + err);
      return res.send('/images/default_logo.jpg');
    }
    var file = files.Filedata;
    var userName = fields.userName;  //fields获取的是jupload
    var userId = fields.userId;
    var newFileName = userName + '.' + file.name.split('.')[1];
    var newFilePath = 'public/images/uploads/' + newFileName;
    fs.rename(file.path, newFilePath);
    User.findByIdAndUpdate(
      userId,
      { logo: '/images/uploads/' + newFileName },
      { new: true },
      function (err, user) {
        if (err) {
          return res.send('/images/default_logo.jpg');
        }
        req.session.user = user;
        req.session.save();
        res.send('/images/uploads/' + newFileName);
      })
    console.log('parsing done');
  });
})

module.exports = router;
