var express = require('express');  //引入第三方框架模块
var router = express.Router();

var Article = require('../models/article.js');   
var mongoose = require('../modules/database.js');
var Category = require('../models/category.js');
var Reply = require('../models/reply.js');
var Page = require('../modules/page.js');

/* GET home page. */
//URL占位符  格式：冒号+变量名  在代码中可以通过变量名
// ?表示此URL占位符可传可不传
router.get('/:page?', function (req, res, next) {
  var category = req.query.category;
  var currentPage = req.params.page || 1;
  currentPage = parseInt(currentPage);

  var filter = { status: 0 }

  Category.find().sort({ _id: -1 })
    .then(function (categories) {
      if (!category) {  //如果category变量没有值时,取数据中最后
        category = categories[categories.length - 1]._id;
      }
      filter.category = category;  //给filter对象添加属性

      var totalPromise = Article.find(filter).count();  
      var articlePromise = Article.find(filter)
        .skip((currentPage - 1) * 10)
        .limit(10)
        .sort({ createTime: -1 })
        .populate('category')
        .populate('userId')
        .populate('lastReplyId');
    //promise 并行异步执行多个任务,如果有一个任务失败,就失败进入catch
      Promise.all([totalPromise, articlePromise])
        .then(function (results) {
          // console.log(results);
          var totalPage = Math.ceil(results[0] / 10);  //总页数
          res.render('index', {
            title: '发现',
            user: req.session.user,
            articles: results[1],
            categories,
            currentCategory: category,
            pages: Page.getPages(currentPage, totalPage), // 视图上显示的页码数字集合
            totalPage: totalPage, // 总页数
            currentPage: currentPage // 当前的页码
          });
        }).catch(function (err) {
          res.json({ code: 201, message: err });
        })
    }).catch(function (err) {
      res.json({ code: 201, message: err });
    })
    
/*   
    Category
      .find()
      .sort({ _id: -1 })
      .exec(function (err, categories) {
        if (!category) {
          category = categories[categories.length - 1]._id;
        }
        filter.category = category;
        Article.find(filter)
          .count()
          .exec(function (err, total) {
            var totalPage = Math.ceil(total / 10);
            // 查询数据
            Article.find(filter)
              // 跨过n条数据
              .skip((currentPage - 1) * 10)
              // 限制取n条数据
              .limit(10)
              // 排序
              .sort({ createTime: -1 })
              .populate('category')
              .populate('userId')
              .populate('lastReplyId')
              .exec(function (err, articles) {
                res.render('index', {
                  title: '发现',
                  user: req.session.user,
                  articles,
                  categories,
                  currentCategory: category,
                  pages: getPages(currentPage, totalPage), // 视图上显示的页码数字集合
                  totalPage: totalPage, // 总页数
                  currentPage: currentPage // 当前的页码
                });
              })
          })
      })
*/
});

// 初始化类别
router.get('/test/aa', function (req, res, next) {
  // var arr = [
  //   { name: '分享' },
  //   { name: '问答' },
  //   { name: '招聘' }
  // ]
  // Category.insertMany(arr, function (err, result) {
  //   res.json({ code: 200, message: 'success' });
  // })

  // var arr = [
  //   {
  //     articleId: '59cb208c16dfde1bf00fe850',
  //     content: 'fjdslfjkdsl',
  //     userId: '59c4c179a8c91f3e08bc9522',
  //     parentId: '59cb208c16dfde1bf00fe850'
  //   }
  // ]
  // Reply.insertMany(arr, function(err, result){
  //   res.json({ code: 200, message: 'success' });
  // })
})

module.exports = router;
