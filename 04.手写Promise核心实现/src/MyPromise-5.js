/* 
	手写Promise A+规范5.0版
	
	主要是实例的catch方法和finally方法的实现
	以及Promise的两个静态方法
	Promise.resolve()和Promise.reject()
	
 */
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
			// 如果value是MyPromise实例 那么就调用then方法
			// 直到这个value被递归解析成为一个普通值  
			if (value instanceof MyPromise) {
				return value.then(resolve, reject);  // 这里加return的意思在不要让代码向下执行 而不是要返回值 这里的返回值没用
			}

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
		// 解决 p.then().then().then(res=>console.log(res));
		onFulfilled = typeof onFulfilled === 'function' ? onFulfilled : v => v;
		onRejected = typeof onRejected === 'function' ? onRejected : err => {
			throw err
		};

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

	/**
	 * @param {Object} onRejected 失败回调
	 * catch其实就是then的第一个参数为null的简写
	 * catch方法也返回一个promise实例
	 */
	catch (onRejected) {
		return this.then(null, onRejected);
	}

	/**
	 * @param {Object} onFinally
	 * finally指的不是最终，而是无论成功还是失败都会执行的意思
	 * 如果Promsie.reject('err').finally() 那么后面必须捕获错误 也就是.catch
	 * finally并不会影响普通值的promise走向
	 * finally的回调里面如果返回了一个promsie，它会等待这个promsie执行完毕，如果结果为成功，那么继续执行
	 * 如果结果失败，那么就会把失败的结果当做传递下去
	 * 
	 * 因为finally方法返回新的promsie
	 */
	finally(onFinally) {
		return this.then(
			(value) => {
				// 成功执行回调
				return MyPromise.resolve(onFinally()).then(() => {
					// 这里是一开始调用finally方法的那个promsie的成功的原因
					return value;
				}, (err) => {
					// 这里是onFinally回调在执行的过程中生成pormise内部失败的原因
					throw err;
				})
			}, (resaon) => {
				// 失败也会执行回调
				return MyPromise.resolve(onFinally()).then(() => {
					// 这里是一开始调用finally方法的那个promsie的失败的原因
					throw resaon;
				}, (err) => {
					// 这里是onFinally回调在执行的过程中生成pormise内部失败的原因
					throw err;
				})
			})
	}

}

/* 
	静态方法resolve 快速创建一个状态为成功的Pormise实例
	这里需要考虑的是如果MyPromise.resolve(new MyPromise((resolve,reject)=>{
		resolve(100)}
		)
	)
	也就是MyPromise.resolve的参数不是一个普通值 而是一个新的Promsie实例 
	也就是我们还需要考虑当我们一开始new一个Promsie的时候 如果executor中resolve了一个新的promsie实例 该如何处理？
	答案就是如果resolve方法的参数是一个promsie实例话 就取出这个实例的then方法并执行 然后将结果也就是新的promise返回 递归解析
 */
MyPromise.resolve = function(value) {
	return new MyPromise((resolve, reject) => {
		resolve(value); // 如果value是一个promsie，那么执行resolve方法会返回一个新的promise，这个新的promsie的值就是解析了value的promise 但是并不关心 真正关心的是要return出去的那个要给被人.then的promise的状态和值 很多时候不要关心返回值 而要把重点放在返回出去的promsie的状态是否变化
	})
}

/* 
	静态方法reject 快速创建一个状态为失败的Pormise实例
	
	MyPromise.resolve和MyPromise.reject的区别就在于resolve会等待参数为promsie的状态发生改变，而reject不会 这个特点及其重要
 */
MyPromise.reject = function(reason) {
	return new MyPromise((resolve, reject) => {
		reject(reason);
	})
}




/**
 * @param {Object} promsie2 执行then方法时内部生成要返回的新的promsie实例
 * @param {Object} x 执行then方法的成功回调或失败回调的返回值
 * @param {Object} reoslve 新的promsie实例的resolve方法
 * @param {Object} reject 新的promsie实例的reject方法
 * 由于多个库比如bluebird\es6-promise都定义了Promise的实现，所以怎么让别人定义的promsie和我们自己实现的promise交互，那就要求实现resolvePromise方法
 */

function resolvePromise(promise2, x, resolve, reject) {
	// A+规范：循环引用 直接报错
	if (promise2 === x) {
		throw new TypeError('Chaining cycle detected for promise #<Promise>')
	}

	/* 
		A+规范
		如果x的值是一个object类型或者函数类型，这个x才可能是一个promise
		x为什么会是函数呢？因为有可能返回的是别人定义的promsie实例 就是函数
	 */
	if ((typeof x === 'object' && x !== null) || typeof x === 'function') {
		/* 
			 就算是对象也是函数 x也不一定百分百是promise
			 
			 首先我们尝试取出x的then方法并赋值给变量then，在这个过程中可能报错,比如：
			 let x = {};
			 Object.defineProperty(x,'then',{
			 	get(){
			 		throw new Error();
			 	}
			 })
			 所以需要try-catch进行错误的捕获,如果出错，就reject出去这个错误e
		 */
		let called = false; // 哨兵变量 防止一个promise第一次走成功回调 第二次走失败回调
		try {
			let then = x.then;
			/* 
				如果取出的then是一个函数，这就可以确定x是一个promise实例,就执行这个then
				方法，但是这里执行是有学问的，不是简单的x.then(),而是利用之前取出的then.call(x)
				
				如果return的这个x也就是promise实例内部resolve的还是一个新的promise，
				那么递归的去resolvePromise 直到遇到一个普通值
				
				如果取出的then是一个对象，那么x不是一个实例，而是一个普通值，直接resolve
			 */
			if (typeof then === 'function') {
				/* 
					为什么要写成then.call(x)呢？就是怕这个x是别人实现的promise，它第一次去取then属性没事，内部的计数器到2的时候，再去访问then属性会报错，虽然这种实现很变态，但是也要考虑到
					let x = {}
					let count = 0;
					Object.defineProperty(x,'then',{
						get(){
							if(++count == 2){
								throw new Error();
							}
							
						}
					})
					then.call(x)中x也就是promise是this对象
					then方法执行的时候参数为两个函数，第一个是成功回调，第二个是失败回调
					各自的参数分别用y和r代表
				 */
				then.call(x, (y) => {
					if (called) return;
					called = true;
					resolvePromise(promise2, y, resolve, reject);
				}, (r) => {
					if (called) return;
					called = true;
					reject(r);
				});
			} else {
				resolve(x);
			}
		} catch (e) {
			// 防止失败了再次走到成功 针对的是别人的promise
			if (called) return;
			called = true;
			reject(e); // 取值出错
		}
	} else {
		/* 
		 A+规范：如果x不是一个promise实例 而是一个普通值
		 那么就直接通过调用promsie2的executor中的resolve传递出去
		 */
		resolve(x);
	}

}



/**
 * finally测试用例
 */

/* MyPromise.resolve(100).finally(() => {
	return new MyPromise((resolve, reject) => {
		setTimeout(() => {
			resolve(200); // 只会等待 不会将200传递给下一个then的成功回调
			// reject(200); // 会等待 还会将错误200传递给下一个catch或者失败回调中
		}, 1000)
	})
}).then((res) => {
	console.log('res', res);
}).catch((err) => {
	console.log('err', err);
})
 */


/**
 * resolve测试用例
 */
const p = new MyPromise((resolve, reject) => {
	resolve(new MyPromise((resolve, reject) => {
		resolve(100);
	}))

});

p.then((res) => {
	console.log(res);
}, err => {
	console.log(err);
})



// module.exports = MyPromise;
/**
 * 最终目的是确定promsie2的状态
 * 1.p1.then的时候，执行构造器z1，定义resolve和reject，执行executor
 * 2.z2执行executor，读取p1转态和值，决定执行then方法的onFulfilled z3
 * 3. z3中开始执行，返回了一个x是p3，值为5000，状态ok别管return了到这里
 * 4. 执行 resolvePromise(promise2,p3,resolve,reject)z4
 * 5. z4执行，p3.then执行 z5
 * 6. z5 p3.then执行构造器z6 定义resolve和reject，执行executor
 * 7. z6 执行executor，读取p3状态态和值为5000，决定执行p3.then方法的onFulfilled z7
 * 8. 这里的onFulfilled已经给你定义好了 你执行就是了 (y)=>{resolvePromise(promise2,y,resolve,reject)}，但是要将p3的值5000传递给y 
 * 9. 执行resolvePromise(promise2,5000,resolve,reject)其实就是执行resolve(5000)
 * 10. promsie2构造完成 值为5000 状态成功
 */