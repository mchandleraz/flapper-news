var app = angular.module('flapperNews', ['ui.router']);

app.config([
	'$stateProvider',
	'$urlRouterProvider',
	function($stateProvider, $urlRouterProvider) {

	$stateProvider
		.state('home', {
		url: '/home',
		templateUrl: '/home.html',
		controller: 'MainCtrl',
		resolve: {
			postPromise: ['posts', function(posts) {
				return posts.getAll();
			}]
		}
	}).state('posts', {
		url: '/posts/{id}',
		templateUrl: '/posts.html',
		controller: 'PostsCtrl',
		resolve: {
			post: ['$stateParams', 'posts', function($stateParams, posts) {
				return posts.get($stateParams.id);
			}]
		}
	}).state('login', {
		url: '/login',
		templateUrl: '/login.html',
		controller: 'AuthCtrl',
		onEnter: ['$state', 'auth', function($state, auth) {
			if (auth.isLoggedIn()) {
				$state.go('home');
			}
		}]
	}).state('register', {
		url: '/register',
		templateUrl: '/register.html',
		controller: 'AuthCtrl',
		onEnter: ['$state', 'auth', function($state, auth) {
			if (auth.isLoggedIn()) {
				$state.go('home');
			}
		}]
	});

	$urlRouterProvider.otherwise('home');
}]);

app.factory('auth', ['$http', '$window', function($http, $window) {
	var factory = {};

	factory.saveToken = function(token) {
		$window.localStorage['flapper-news-token'] = token;
	};

	factory.getToken = function() {
		return $window.localStorage['flapper-news-token'];
	};

	factory.isLoggedIn = function() {
		var token = factory.getToken();

		if (token) {
			var payload = JSON.parse($window.atob(token.split('.')[1]));
			return payload.exp > Date.now() / 1000;
		} else {
			return false;
		}
	};

	factory.currentUser = function() {
		if (factory.isLoggedIn()) {
			var token = factory.getToken();
			var payload = JSON.parse('"' + $window.localStorage['flapper-news-token'] + '"');

			return payload.username;
		}
	};

	factory.register = function(user) {
		return $http.post('/register', user).success(function(data) {
			factory.saveToken(data.token);
		});
	};

	factory.logIn = function(user) {
		return $http.post('/login', user).success(function(data) {
			factory.saveToken(data.token);
		});
	};

	factory.logOut =function(user) {
		$window.localStorage.removeItem('flapper-news-token');
	};

	return factory;

}]);

app.factory('posts', ['$http', 'auth', function($http, auth) {

	var factory = {};

	factory.posts = [
		{
			title:'post 1',
			link:'http://www.google.com/',
			upvotes: 12,
			comments: [
				{author: 'Joe', body: 'Cool post!', upvotes: 0},
				{author: 'Bob', body: 'Great idea but everything is wrong!', upvotes: 0}
			]
		},
		{
			title:'post 2',
			upvotes: -3,
			comments: [
				{author: 'Joe', body: 'Cool post!', upvotes: 0},
				{author: 'Bob', body: 'Great idea but everything is wrong!', upvotes: 0}
			]
		},
		{
			title:'post 3',
			upvotes: 43,
			comments: [
				{author: 'Joe', body: 'Cool post!', upvotes: 0},
				{author: 'Bob', body: 'Great idea but everything is wrong!', upvotes: 0}
			]
		}
	];

	factory.get = function(id) {
		return $http.get('/posts/'+ id).then(function(res) {
			return res.data;
		});
	};

	factory.getAll = function() {
		return $http.get('/posts').success(function(data) {
			angular.copy(data, factory.posts);
		});
	};

	factory.create = function(post) {
		return $http.post('/posts', post, {
			headers: {authorization: 'Bearer ' + auth.getToken()}
		}).success(function(data) {
			factory.posts.push(data);
		});
	};

	factory.upvote = function(post) {

		return $http.put('/posts/' + post._id + '/upvote', {
			headers: {authorization: 'Bearer ' + auth.getToken()}
		}).success(function(data) {
			post.upvotes += 1;
		});
	};

	factory.addComment = function(id, comment) {
		return $http.post('/posts/' + id + '/comments', comment, {
			headers: {authorization: 'Bearer ' + auth.getToken()}
		});
	};

	factory.upvoteComment = function(post, comment) {
		return $http.put('/posts/' + post._id + '/comments/' + comment._id + '/upvote', {
			headers: {authorization: 'Bearer ' + auth.getToken()}
		}).success(function(data) {
			comment.upvotes += 1;
		});
	};

	return factory;

}]);

app.controller('MainCtrl', [
	'$scope',
	'posts',
	function($scope, posts) {
		$scope.test = '\'allo!';

		$scope.posts = posts.posts;

		$scope.addPost = function() {
			if (!$scope.title) {
				return;
			}
			posts.create({
				title: $scope.title,
				link: $scope.link
			});
			$scope.title = '';
			$scope.link = '';
		};

		$scope.incrementUpvotes = function(post) {
			posts.upvote(post);
		};
	}
]).controller('PostsCtrl', [
	'$scope',
	'posts',
	'post',
	function($scope, posts, post) {
		$scope.post = post;

		$scope.addComment = function() {
			if ($scope.body === '') {
				return;
			}
			posts.addComment(post._id, {
				body: $scope.body,
				author: 'user'
			}).success(function(comment) {
				$scope.post.comments.push(comment);
			});
			$scope.body = '';
		};

		$scope.incrementUpvotes = function(comment){
			posts.upvoteComment(post, comment);
		};
	}
]).controller('AuthCtrl', [
	'$scope',
	'$state',
	'auth',
	function($scope, $state, auth) {
		$scope.user = {};

		$scope.register = function() {
			auth.register($scope.user).error(function(error) {
				$scope.error = error;
			}).then(function() {
				$state.go('home');
			});
		};

		$scope.logIn = function() {
			auth.logIn($scope.user).error(function(error) {
				$scope.error = error;
			}).then(function() {
				$state.go('home');
			});
		};
	}
]).controller('NavCtrl', [
	'$scope',
	'auth',
	function($scope, auth) {
		$scope.isLoggedIn = auth.isLoggedIn;
		$scope.currentUser = auth.currentUser;
		$scope.logOut = auth.logOut;
	}
]);