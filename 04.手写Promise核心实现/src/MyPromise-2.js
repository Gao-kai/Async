/* 
	手写Promise A+规范2.0版
	上一版的问题有：
	1. 如果在executor中我们传入的业务逻辑是1秒之后才发生状态的改变，此时就会存在问题：
	由于executor是同步执行，执行的过程中产生了异步代码，此时在外部调用实例的then方法的时候，promise实例内部的状态既不是FULLFILLED也不是REJECTED，而是PENDING，所以此时执行then方法是没效果的

	2. 一个promise实例可以在外界多次调用自己的then方法，这可不是链式调用，是多次分开的调用，在resolve的时候这些then方法中的onFulfilled回调应该依次执行
	
	综合以上两个问题，我们应该使用发布订阅模式，分别用两个列表存放：
	1. onFulfillList存放当前实例执行then方法时的成功回调，因为可能有多个且依次执行
	2. onRejectList存放当前实例执行then方法时的失败回调，因为可能有多个且依次执行
	
	1. 异步相关的问题基本都需要用到发布订阅模式
	2. 函数包装方便传参的技巧 AOP切片编程思想
	
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
