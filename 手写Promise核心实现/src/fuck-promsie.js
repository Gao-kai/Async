const PENDING = 'PENDING';
const FULFILLED = 'FULFILLED';
const REJECTED = 'REJECTED';

class FuckPromise {
	constructor(executor) {
		this.status = PENDING;
		this.value = undefined;
		this.reason = undefined;
		this.onFulfilledCbList = [];
		this.onRejectedCbList = [];

		const resolve = (value) => {
			if (this.status === PENDING) {
				this.status = FULFILLED;
				this.value = value;
				this.onFulfilledCbList.forEach(cb => {
					cb();
				});
			}
		}

		const reject = (reason) => {
			if (this.status === PENDING) {
				this.status = REJECTED;
				this.reason = reason;
				this.onRejectedCbList.forEach(cb => {
					cb();
				})
			}

		}

		try {
			executor(resolve, reject);
		} catch (e) {
			reject(e);
		}
	}

	then(onFulfilled, onRejected) {
		let promise2 = new FuckPromise((resolve, reject) => {

			if (this.status === PENDING) {
				this.onFulfilledCbList.push(() => {
					setTimeout(() => {
						try {
							let x = onFulfilled(this.value);
							resolvePromise(promise2, x, resolve, reject);
						} catch (e) {
							reject(e);
						}

					}, 0)
				});

				this.onRejectedCbList.push(() => {
					setTimeout(() => {
						try {
							let x = onRejected(this.reason);
							resolvePromise(promise2, x, resolve, reject);
						} catch (e) {
							reject(e);
						}
					}, 0)
				});
			}

			if (this.status === FULFILLED) {
				setTimeout(() => {
					try {
						let x = onFulfilled(this.value);
						resolvePromise(promise2, x, resolve, reject);
					} catch (e) {
						reject(e);
					}

				}, 0)

			}

			if (this.status === REJECTED) {
				setTimeout(() => {
					try {
						let x = onRejected(this.reason);
						resolvePromise(promise2, x, resolve, reject);
					} catch (e) {
						reject(e);
					}
				}, 0)
			}
		})

		return promise2;
	}
}

function resolvePromise(promise2, x, resolve, reject) {
	// console.log('promise2,x,resolve,reject', promise2, x);
	if(promise2===x){
		throw new TypeError('Chaining cycle detected for promise #<Promise>')
	}
	resolve(x);

}

let p1 = new FuckPromise((resolve, reject) => {
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
