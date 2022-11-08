/* 
	promise解决的问题：
	1. 回调嵌套扁平化 .then.then去执行
	2. 解决同步发起多个异步请求，并行请求
	
	如何将一个node的异步api转化为一个promsie？
	如果是核心模块 可以调用require('fs').promises
	或者调用node里面的util库里面的promisify
	
	
 */
const fs = require('fs');
const util = require('util');
// fs.readFile('./debug.html','utf-8',function(err,data){
// 	console.log("err: ",err);
// 	console.log("data: ",data);
// })

// let read = util.promisify(fs.readFile);
// read('./debug.html','utf-8').then(data=>{
// 	console.log("data: ",data);
// }).catch(err=>{
// 	console.log("err: ",err);
// })

/* 
	实现promisify
	核心就是将回调参数 ===> promise.then
	只能针对node的api 你可记住了哦
 */
function promisify(fn) {
	// 返回出去一个包装了promsie的函数
	return (...args) => {
		return new Promise((resolve, reject) => {
			try {
				fn(...args, (err, data) => {
					if (err) {
						reject(err);
					} else {
						resolve(data);
					}
				})
			} catch (e) {
				reject(e);
			}
		})
	}
}

/* 
	自己实现promisify All 
	bluebird中用到的
	将obj上的所有方法转化为promise
 */
function myPromisifyAll(obj) {
	let result = {};
	for (let key of Object.keys(obj)) {
		if (typeof obj[key] === 'function') {
			result[key + 'Promise'] = myPromisify(obj[key])
		}
	}
	return result;
}


/* 
	同步发起多个异步并行的请求：
	1. 如何保证请求返回的时间
	2. 如何保证请求的顺序就是返回结果的顺序
	
	之前是借助于定时器实现的
	Promsie.all实现难点
	all方法中出现失败的promsie 还是会执行并返回结果
	但是结果没有被采用而已，这是一个Promsie的小缺陷 
	无法中断，真实的场景是如果我们发现一个失败就终止promsie继续执行了
	
	fetch也是无法中断的
	这就要看那个公众号文章啦
	1. 参数有promsie才调用then，普通值直接返回
 */

const MyPromise = require('./MyPromise-6');
MyPromise.all = function(promises) {
	return new MyPromise((resolve, reject) => {
		let counter = 0;
		let result = [];

		function handlePromise(index, value) {
			result[index] = value;
			counter++;
			if (counter === promises.length) {
				resolve(result);
			}
		}

		for (let i = 0; i < promises.length; i++) {
			let promise = promises[i];
			if (promise.then && typeof promise.then === 'function') {
				promise.then((value) => {
					handlePromise(i, value);
				}, reject)
			} else {
				handlePromise(i, promise);
			}
		}

	})
}

function A() {
	return new MyPromise((resolve, reject) => {
		setTimeout(() => {
			console.log('A执行')
			resolve(1000)
		}, 1000)
	})
}

function B() {
	return new MyPromise((resolve, reject) => {
		setTimeout(() => {
			console.log('B执行')
			reject(500)
		}, 500)
	})
}


/* MyPromise.all([A(), 300, 600, B()]).then((arr) => {
	console.log(arr);
}).catch(err => {
	console.log(err);
}) */


/* 
	race的方法就是赛跑
	那个promise先执行成功就先返回那个 后面的要执行 但是不会计算结果了
	那个失败的快也返回那个
 */
MyPromise.race = function(promises) {
	return new MyPromise((resolve, reject) => {
		for (let i = 0; i < promises.length; i++) {
			let p = promises[i];
			if (p.then && typeof p.then === 'function') {
				// 多个promsie中只要有一个状态变化为成功 就执行resolve方法
				// 执行resolve方法 说明return出去的promsie的状态已经确定了
				// 失败也是同样的道理
				p.then(resolve, reject);
			} else {
				// 是一个基本值 直接返回结果
				resolve(p);
			}
		}
	})
}


/* MyPromise.race([A(), B()]).then((res) => {
	console.log('res', res);
}).catch(err => {
	console.log(err);
})
 */


/* 
	基于race实现中断promise：指的不是中断promsie请求的执行，而是放弃执行的结果
	一个promsie正在走向成功，需要等3秒
	需求是如果2s不返回结果就认为失败了 中断这个promise
 
 */

/* let abort = null;
let p1 = new MyPromise((resolve, reject) => {
	abort = reject;
	setTimeout(() => {
		console.log('开始执行')
		resolve('等待5秒后成功了')
	}, 5000)
})
p1.abort = abort;

p1.then((res) => {
	console.log(res);
}, err => {
	console.log(err);
})

setTimeout(() => {
	p1.abort('等待3秒没有结果，认为错误'); // 
}, 3000) */


/* 
	封装一个中止promsie返回结果的方法wrap
	返回出去的这个promsie并不会影响原始promise执行的结果
 */
function wrap(promise) {
	let abort = null;
	// 把控制自己这个promsie失败的reject函数引用给了abort变量
	let _promise = new MyPromise((resolve,reject)=>{
		abort = reject;
	});
	
	// race方法只要成功一个立即成功 失败一个立即失败 我就要在外边手动控制让自己的这个失败从而让绑在一起的那个p1后续的结果被忽略 提前获取返回的resultPromsie的结果 
	let resultPromsie = MyPromise.race([_promise,promise]);
	// 把控制自己这个promsie失败的reject函数引用给了abort变量，然后挂载到返回的promsie上
	resultPromsie.abort = abort;
	return resultPromsie;
}

// let p0 = new MyPromise((resolve, reject) => {
// 	abort = reject;
// 	setTimeout(() => {
// 		console.log('开始执行')
// 		resolve('等待5秒后成功了')
// 	}, 5000)
// })

// let p6 = wrap(p0);


// p6.then((res) => {
// 	console.log(res);
// }, err => {
// 	console.log(err);
// })
// setTimeout(() => {
// 	p6.abort('等待3秒没有结果，认为错误'); // 
// }, 3000)


/* 
中断promsie的链式调用 
返回一个既不成功也不失败的promsie 终止链式调用
 */
const p8 = new MyPromise((resolve,reject)=>{resolve(100)});
// p8.then(()=>{return 200}).then(()=>{return 300}).then((res)=>{console.log(res)});
// 到300的时候就中止链式调用
p8.then(()=>{return 200}).then(()=>{return new Promise(()=>{})}).then((res)=>{console.log(res)});