/* 
	手写Promise A+规范1.0版
	1. Promise中有三个状态 等待pending 成功fulfilled 失败rejected，默认状态下就是等待状态
	2.new Promise的时候传入的执行器executor函数自己接收两个参数，这两个参数也是两个函数，分别用resolve和reject代指，分别用来描述Promise的当前状态.如果调用resolve那么会将状态修改为成功，如果调用reject函数那么代表出现异常或者失败，会将状态修改为失败
	3.使用这个Promise类的时候，必须要传入一个函数也就是执行器executor，这个函数会在new Promise的时候会被立即同步执行
	4. 每一个通过new Promise得到的promise实例上都有一个then方法，then方法接收两个函数作为参数，分别是当前promise内部状态为成功或者为失败后的回调函数。
	5. resolve和reject在调用的时候可以传递参数，这个参数会被then方法中的成功回调或者失败回调函数的形参所接收
	6. 如果是executor中抛出了异常 那么也会走到then方法的失败回调中
	7. promise一旦状态发生变化，那么不可再次更改 也就是说先调用resolve 然后再调用reject或者抛出异常 那么只会执行resolve的成功回调 因为状态是不可发生更改的
 */


class MyPromise {

	/* 定义Promise实例的三种状态 */
	PENDING = 'pending';
	FULLFILLED = 'fullfilled';
	REJECTED = 'rejected';

	constructor(executor) {
		// 初始化promise实例初始状态为PENDING
		this.PromiseState = this.PENDING;

		// 初始化promise实例状态为成功的值和状态失败的原因
		this.value = undefined;
		this.reason = undefined;

		/**
		 * 每创建一个Promise实例的时候resolve和reject函数哪里来的？
		 * 1. 不是用户自己传入
		 * 2. 也不是Promise类的原型上的方法 
		 * 
		 * 那就是内部自己实现的，实现要点：
		 * 1. reolve和reject都是函数
		 * 2. resolve函数接收一个Promise状态从等待到成功的值value当做参数
		 * 3. 执行resolve函数，如果内部状态为原始态pending，那么就将参数value的值赋值给Promise实例的this.value，并且将状态修改为成功fullfilled
		 * 4.reject函数的实现逻辑同上
		 * 5.不管是resolve还是reject，执行的原因都是为了修改内部状态并且传递状态变化的值/原因
		 * 6.只有实例内部状态为PENDING态的时候，才可以修改内部的状态
		 * 7.resolve和reject都为箭头函数，是为了其内部的this指向Promise实例
		 */

		const resolve = (value) => {
			if (this.PromiseState === this.PENDING) {
				this.value = value;
				this.PromiseState = this.FULLFILLED;
			}
		}

		const reject = (reason) => {
			if (this.PromiseState === this.PENDING) {
				this.reason = reason;
				this.PromiseState = this.REJECTED;
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
		if (this.PromiseState === this.FULLFILLED) {
			onFulfilled(this.value);
		} else if (this.PromiseState === this.REJECTED) {
			onRejected(this.reason);
		}
	}
}


/**
 * 测试用例
 */
const promise = new MyPromise((resolve,reject)=>{
	console.log('MyPromise的executor执行！');
	// resolve('success');
	// reject('fail');
	throw new Error('executor执行出错');
})

promise.then((value)=>{
	console.log('当前Promise实例内部状态为',promise.PromiseState,'value ===>',value);
},(reason)=>{
	console.log('当前Promise实例内部状态为',promise.PromiseState,'reason ===>',reason);
})

console.log('同步执行的代码1');

/* 
 执行结果：
 MyPromise的executor执行！
 当前Promise实例内部状态为 fullfilled value ===> success 
 同步执行的代码(这里有问题，用setTimeout实现)
 */


module.exports = MyPromise;
