## 核心问题解决启示录
1. promise.then的返回值是一个新的promise实例
这边在then方法内部new一个新的promise实例，然后return出去
```js
let promise = new MyPromise((resolve,reject)=>{
			
})
return promise;
```

2. 在new Promise的时候，传入的executor函数体中执行了resolve方法，并将成功的结果当做参数传入了resolve方法中，此时调用当前这个promise实例的then方法的时候，自然就会去执行then方法参数的onFulfilled回调函数，并将成功的结果也就是resolve的结果当做实参传递给这个onFulfilled回调函数的参数，一般为res或者data
```js
let p1 = new Promise((resolve,reject)=>{
	resolve(100);
})

let p2 = p1.then((res) => {
	console.log('res', res)
	return '普通值100';
}, (reason) => {
	console.log('reason', reason)
});
```

要搞清楚，resolve的100是传递到then方法的onFulfilled回调函数的res中的，那么照猫画虎，p1.then方法的onFulfilled回调函数return的结果(假设是最简单的普通值200)要当做实参传递到下一个promise的onFulfilled回调函数的参数，一般为res或者data。此时是不是就可以把这个200包裹在一个Promise的executor函数中的resolve中呢？

问题来了，这个包裹的Promise从何而来呢？答案正就是我们一开始要返回的那个Promise新的实例。

```js
then(onFulfilled, onRejected){
	let promise = new MyPromise((resolve,reject)=>{
		if (this.PromiseState === this.FULLFILLED) {
			// 拿到当前调用then方法的onFulfilled执行的结果 也就是resolve的结果
			let x = onFulfilled(this.value);
			resolve(x);
		}
	})
	
	return promise;
}
```

new Promise的时候发生了什么(函数调用栈)
1. 执行Promise的constructor构造函数，将executor当做参数传入
2. 初始化PromiseState状态为pengding、初始化value、reason
3. 初始化存放成功和失败回调的列表 为异步准备的
4. 定义resolve方法和reject方法
5. try-catch语句执行executor函数，并将resolve和reject传入
6. 一般来说，用户传入的executor函数中应该会有成功或者失败的结果，也就是会调用resolve或reject
7. executor函数中resolve被同步调用：修改状态为fulfilled、参数赋值给this.value、依次执行实例在调用then方法时积累的成功回调列表中的方法
8. executor函数中reject被同步调用：修改状态为rejected、参数赋值给this.reason、依次执行失败回调列表中的方法
9. executor函数中resolve或reject被异步调用，比如网络请求或定时器中执行，此时外界在调用then的时候状态一定还是pengding、所以会将then的onFulfilled和onRejected依次push到列表中缓存起来，然后等到异步返回结果了，根据结果调用resolve还是reject，再将之前缓存在列表中的回调依次执行

执行then方法的时候需要做哪些事情：
1. 首先是new一个新的Promise，因为then方法一定返回一个Promise
2. 然后将之后所有的逻辑写在这个新的Promise的executor函数中同步执行

第一步首先是判断调用then方法的这个promsie实例的状态，并根据状态来做不同的事情：
1. 状态为成功FULLFILLED，此时需要执行then方法的onFulfilled回调，并获取到onFulfilled回调执行的结果，然后resolve出去。

这里是最关键的一点：因为return出去的这个新的Promise实例在调用then方法的时候，其自己的onFulfilled回调的参数就是上一个promsie的executor中resolve的结果，这是递归调用的结果。

2. 状态为失败REJECTED，此时需要执行then方法的onRejected回调，并获取到onRejected回调执行的结果，然后resolve出去。
注意这里为什么不是reject出去呢？原因就在于A+规范规定了如果then方法中的成功还是失败回调，如果其返回值是一个普通值，就都会将这个普通值传递给下一个then的成功回调中去。

什么是普通值：
1. 除了promise实例
2. 除了throw的new ERROR
剩余的都是普通值，包含基本值 引用值 undefiend也在内

接着上诉逻辑继续，上面实现的都是返回的值为普通值的情况，如果then方法中的onFulfilled或者onRejected回调返回值是一个promsie实例呢？该如何处理？

A+规范规定：
如果返回值是一个promsie实例，那么需要判断这个promise内部的状态
如果是成功态，就传递给下一个then的成功回调
如果是失败态，就传递给下一个then的失败回调

现在的问题是我们要根据返回值x是普通值还是promise实例来决定在promise2的executor中如何resolve或者reject？
+ 如果x是普通值 很简单 全部reolve即可
+ 如果x是promsie实例，假设为promsie3.那就再调用这个promise3的then方法，取出promsie3内部的executor导致是resolve还是reject，并获取到结果

说个地方用到，所以统一封装：resolvePromise
1. 第一个问题，resolvePromise执行的时候压根是取不到promise2的，因为resolvePromise是在promsie2的executor中执行的，executor中是同步执行的，此时promsie2还没有生成。所以要想在resolvePromise执行的时候拿到promsie2，就需要将resolvePromise的执行放到下一轮的事件循环中去，最好的就是利用settimeout 0

2. 第二个问题
在没有加settimeout之前，then方法中的onFulfilled或者onRejected执行的时候抛出异常或者报错，此时会被constructor中的try-catch捕获，因为then方法中所有的逻辑其实都是在Promise的constructor传入的参数executor执行的，所以同步的执行是可以捕获的 

但是加了settimeout之后，就不好捕获了，也就是同步执行的executor中是捕获不到的。此时应该给then方法中的onFulfilled或者onRejected执行的时候每个都加上一个try-catch捕获机制 一旦捕获到错误，就走到catch里面直接reject出去这个错误，下一个then调用的时候直接会走到then的失败回调中

3. 第三个问题
由于then方法中onFulfilled或者onRejected执行的结果也就是返回值x会影响到下一个then方法调用时到底走onFulfilled还是onRejected

如果返回值x的值又是本来就执行then方法要返回的新的那个Promise实例，