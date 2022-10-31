/* 
	手写Promise A+规范3.0版
	这一版主要实现then的链式调用相关内容，这是Promise解决串行回调地狱的核心API实现
	
	1.then方法的成功回调onFulfilled和失败回调onRejected执行的函数返回值，可以传递到下一个链式调用的then方法中。
	
	2. 成功回调onFulfilled和失败回调onRejected返回值不同，其表现也不同：
	
	如果返回的是JS中的普通值(普通值就是非报错非promise的值)，那么都会将这个返回值当做参数传递到下一个then方法的成功回调中去，注意就算是上一个then方法的onRejected返回的也会传递到下一个then的成功回调而不是失败回调
	
	如果返回的是一个新的promise，那么会看这个新的promise内部的状态是成功还是失败，成功就传递到下一个then 方法的成功回调，失败就走失败回调
	
	如果执行报错，那么直接传递到下一个then方法的失败回调中去，如果多个then的回调连续报错，就将上一个then的最近的错误信息传递到下一个then的失败回调中去。
	
	3. 如果离自己最近的then没有错误处理，那么错误会一直向下传递。
	
	4. then方法的返回值是一个新的promise实例，所以可以链式调用，如果返回的是一个this也可以链式调用但是同一个promise实例的状态不可逆，所以 必须是一个新的promsie实例
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
				
				// 将调用then方法时订阅的成功回调依次执行
				this.onFulfilledCbList.forEach(onFulfilledCb=>{
					onFulfilledCb();
				})
			}
		}

		const reject = (reason) => {
			if (this.PromiseState === this.PENDING) {
				this.reason = reason;
				this.PromiseState = this.REJECTED;
				
				// 将调用then方法时订阅的成功回调依次执行
				this.onRejectedCbList.forEach(onRejectedCb=>{
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
		// 执行then方法时状态为FULLFILLED或者REJECTED 说明executor中的resolve或reject是同步执行的
		if (this.PromiseState === this.FULLFILLED) {
			onFulfilled(this.value);
		}

		if (this.PromiseState === this.REJECTED) {
			onRejected(this.reason);
		}

		// 执行then方法时状态为PENDING 说明executor中的resolve或reject是异步执行的，此时需要先订阅成功回调和失败回调，等executor中异步代码执行完毕状态发生变化时再发布，依次取出执行
		if (this.PromiseState === this.PENDING) {
			console.log('等待中...')
			
			// 小技巧：直接写this.onFulfilledCbList.push(onFulfilled)会没法传递参数 并且没法在执行onFulfilled之前或者之后再去做一些其他的事情 所以包装一层 实现切片
			this.onFulfilledCbList.push(()=>{
				// before todo
				onFulfilled(this.value);
				// after todo
			})
			
			this.onRejectedCbList.push(()=>{
				onFulfilled(this.reason);
			})
		}
	}
}


/**
 * 测试用例
 */
const promise = new MyPromise((resolve, reject) => {
	setTimeout(() => {
		// resolve('1s之后的成功值');
		reject('1s之后的失败值');
	}, 1000)
})

promise.then((value) => {
	console.log('success1', value)
}, (reason) => {
	console.log('reason1', reason)
})

promise.then((value) => {
	console.log('success2', value)
}, (reason) => {
	console.log('reason2', reason)
})

module.exports = MyPromise;
