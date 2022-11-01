/* 
	手写Promise A+规范4.0版
	这一版主要实现resolvePromsie的实现
	
	
 */

// const PENDING = 'PENDING';
// const FULFILLED = 'FULFILLED';
// const REJECTED = 'REJECTED';

class MyPromise {

	/* 定义Promise实例的三种状态 */
	PENDING = 'pending';
	FULFILLED = 'fulfilled';
	REJECTED = 'rejected';
	

	constructor(executor) {
		// 初始化promise实例初始状态为PENDING
		this.status = this.PENDING;

		// 初始化promise实例状态为成功的值和状态失败的原因
		this.value = undefined;
		this.reason = undefined;

		// 初始化暂存成功和失败回调的列表
		this.onFulfilledCbList = [];
		this.onRejectedCbList = [];
		


		/**
		 * 每创建一个Promise实例的时候resolve和reject函数哪里来的？
		 * 1. 不是用户自己传入
		 * 2. 也不是Promise类的原型上的方法 
		 * 
		 * 那就是内部自己实现的，实现要点：
		 * 1. reolve和reject都是函数
		 * 2. resolve函数接收一个Promise状态从等待到成功的值value当做参数
		 * 3. 执行resolve函数，如果内部状态为原始态pending，那么就将参数value的值赋值给Promise实例的this.value，并且将状态修改为成功fulfilled
		 * 4.reject函数的实现逻辑同上
		 * 5.不管是resolve还是reject，执行的原因都是为了修改内部状态并且传递状态变化的值/原因
		 * 6.只有实例内部状态为PENDING态的时候，才可以修改内部的状态
		 * 7.resolve和reject都为箭头函数，是为了其内部的this指向Promise实例
		 */

		const resolve = (value) => {
			if (this.status === this.PENDING) {
				this.value = value;
				this.status = this.FULFILLED;

				// 将调用then方法时订阅的成功回调依次执行
				this.onFulfilledCbList.forEach(onFulfilledCb => {
					onFulfilledCb();
				})
			}
		}
		

		const reject = (reason) => {
			if (this.status === this.PENDING) {
				this.reason = reason;
				this.status = this.REJECTED;

				// 将调用then方法时订阅的成功回调依次执行
				this.onRejectedCbList.forEach(onRejectedCb => {
					onRejectedCb();
				})
			}
		}
		

		/**
		 * 1.用户传入的executor函数是立即同步执行的
		 * 2.executor函数接收两个参数，分别为内部自己实现的resolve和reject
		 * 3.执行过程中报错，则直接执行reject方法将内部状态修改为失败，并将报错的原因当做参数传递给reject
		 * 4.执行过程中不出错，那么按照用户传入的业务逻辑来确定是成功还是失败
		 */
		try {
			executor(resolve, reject);
		} catch (e) {
			reject(e);
		}
	}


	/**
	 * @param {Object} onFulfilled 实例状态变为成功的回调函数
	 * @param {Object} onRejected 实例状态变为失败的回调函数
	 */
	then(onFulfilled, onRejected) {
		// 为了实现then的链式调用 每次调用then方法都会生成一个新的Promise实例返回
		let promise2 = new MyPromise((resolve, reject) => {
			// 执行then方法时状态为PENDING 说明executor中的resolve或reject是异步执行的，此时需要先订阅成功回调和失败回调，等executor中异步代码执行完毕状态发生变化时再发布，依次取出执行
			if (this.status === this.PENDING) {
				// 小技巧：直接写this.onFulfilledCbList.push(onFulfilled)会没法传递参数 并且没法在执行onFulfilled之前或者之后再去做一些其他的事情 所以包装一层 实现切片
				this.onFulfilledCbList.push(() => {
					// before todo
					setTimeout(() => {
						try {
							let x = onFulfilled(this.value);
							resolvePromise(promise2, x, resolve, reject);
						} catch (e) {
							// 执行报错 就不必走到resolvePromise中解析x了 直接reject
							reject(e);
						}
					}, 0)
					// after todo
				})

				this.onRejectedCbList.push(() => {
					setTimeout(() => {
						try {
							let x = onRejected(this.reason);
							resolvePromise(promise2, x, resolve, reject)
						} catch (e) {
							reject(e);
						}
					}, 0)
				})
			}

			// 执行then方法时状态为FULFILLED或者REJECTED 说明executor中的resolve或reject是同步执行的
			if (this.status === this.FULFILLED) {
				// 拿到外部调用then方法的那个promise成功的结果 可能是普通值或者promsie实例
				setTimeout(() => {
					try {
						let x = onFulfilled(this.value);
						resolvePromise(promise2, x, resolve, reject);
					} catch (e) {
						// 执行报错 就不必走到resolvePromise中解析x了 直接reject
						reject(e);
					}

				}, 0)

			}

			if (this.status === this.REJECTED) {
				setTimeout(() => {
					try {
						let x = onRejected(this.reason);
						resolvePromise(promise2, x, resolve, reject)
					} catch (e) {
						reject(e);
					}
				}, 0)
			}


		})

		return promise2;
	}
}



/**
 * @param {Object} promsie2 执行then方法时内部生成要返回的新的promsie实例
 * @param {Object} x 执行then方法的成功回调或失败回调的返回值
 * @param {Object} reoslve 新的promsie实例的resolve方法
 * @param {Object} reject 新的promsie实例的reject方法
 */

function resolvePromise(promise2, x, resolve, reject) {
	// console.log('promise2,x,resolve,reject', promise2, x);
	// 循环引用 直接报错
	if (promise2 === x) {
		throw new TypeError('Chaining cycle detected for promise #<Promise>')
	}
	resolve(x);
}



/**
 * 测试用例
 */
let p1 = new MyPromise((resolve, reject) => {
	resolve(100);
	// reject(100);
	// throw new Error("执行错误")

});

let p2 = p1.then((res) => {
	console.log('p1-res', res);
	return p2;
}, (err) => {
	console.log('p1-err', err);
})


p2.then((res) => {
	console.log('p2-res', res);
}, (err) => {
	console.log('p2-err', err);
})