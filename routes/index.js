var express = require('express'),
	router = express.Router(),
	mongoose = require('mongoose'),
	Post = mongoose.model('Post'),
	Comment= mongoose.model('Comment'),
	passport = require('passport'),
	User = mongoose.model('User'),
	jwt = require('express-jwt'),
	auth = jwt({
		secret: 'SEACREST', // Use an environment var!
		userProperty: 'payload'
	});

/* GET home page. */
router.get('/', function(req, res, next) {
	res.render('index', { title: 'Express' });
});

router.get('/posts', function(req, res, next) {
	Post.find(function(err, posts){
		if(err){
			return next(err);
		}

		res.json(posts);
	});
});

router.post('/posts', auth, function(req, res, next) {
	var post = new Post(req.body);

	post.author = req.payload.username;

	post.save(function(err, post) {
		if (err) {
			return next(err);
		}
		res.json(post);
	});
});

router.param('post', function(req, res, next, id) {
	var query = Post.findById(id);

	query.exec(function(err, post) {
		if (err) {
			return next(err);
		}
		if (!post) {
			return next(new Error('cant\'t find post'));
		}
		req.post = post;
		return next();
	});

});

router.param('comment', function(req, res, next, id) {
	var query = Comment.findById(id);

	query.exec(function(err, comment) {
		if (err) {
			return next(err);
		}
		if (!comment) {
			return next( new Error('can\'t find comment'));
		}
		req.comment = comment;
		return next();
	});
});

router.get('/posts/:post', function(req, res, next) {
	req.post.populate('comments', function(err, post) {
		if (err) {
			return next(err);
		}

		res.json(post);

	});
});

router.put('/posts/:post/upvote', auth, function(req, res) {
	req.post.upvote(function(err, post) {
		if (err) {
			return next(err);
		}

		res.json(post);

	});
});

router.post('/posts/:post/comments', auth, function(req, res, next) {
	var comment = new Comment(req.body);

	comment.post = req.post;
	comment.author = req.payload.username;

	comment.save(function(err, comment) {
		if (err) {
			return next(err);
		}

		if (req.post.comments === null) {
			req.post.comments = [];
		}

		req.post.comments.push(comment);

		req.post.save(function(err, post) {
			if (err) {
				return next(err);
			}
			res.json(comment);
		});
	});
});

router.get('/comments/:comment', function(req, res) {
	res.json(req.comment);
});

router.put('/posts/:posts/comments/:comment/upvote', auth, function(req, res) {
	req.comment.upvote(function(err, comment) {
		if (err) {
			return next(err);
		}

		res.json(comment);

	});
});

router.post('/register', function(req, res, next){
	if (!req.body.username || !req.body.password) {
		return res.status(400).json({
			message: 'please fill out all fields'
		});
	}
	var user = new User();

	user.username = req.body.username;
	user.setPassword(req.body.password);

	user.save(function(err) {
		if (err) {
			return next(err);
		}

		return res.json({
			token: user.generateJwt()
		});

	});
});

router.post('/login', function(req, res, next) {
	if (!req.body.username || !req.body.password) {
		return res.status(400).json({
			message: 'please fill out all fields'
		});
	}
	passport.authenticate('local', function(err, user, info) {
		if (err) {
			return next(err);
		}

		if (user) {
			return res.json({
				token: user.generateJwt()
			});
		} else {
			res.status(401).json(info);
		}

	})(req, res, next);
});

module.exports = router;