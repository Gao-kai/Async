## ES7新增语法糖 async await

+ 函数中只要使用await，该函数必须用async修饰符进行修饰；但是async修饰符是可以单独使用的,单独使用async修饰符修饰一个函数之后，如果函数内部没有await，那么会控制函数内部return的值是一个Promise实例，比如：
如果是以下几种情况那么默认会将函数的返回值包装为一个Promise类的实例，并且把这个实例的状态修改为fulfilled；实例的修改为return出去的值。
 1. return一个非Promise类的实例
 2. return了一个本来就是Promise类的实例
 3. 函数默认不返回任何内容，等于return undefined
 ```js
 async function demo(){
 	return 100;
	return Promise.resolve(88);
	// return undefined;
 }
 console.log(demo());
 
 [[PromiseState]]: "fulfilled"
 [[PromiseResult]]: 100 / 88 / undeinfed
 ```
如果是以下几种情况那么会返回一个状态为rejected，值为错误对象的Promise实例。
 1. 函数执行过程中报错
 2. 手动throw了一个Error对象
```js
async function demo(){
	throw new TypeError('类型错误')
}
async function demo(){
	console.log(a);
}

console.log(demo());

/* then的第二个onRejected捕获错误 */
demo().then(res=>{
	console.log(res);
},err=>{
	console.log(err.message);
})

/* 用catch方法直接捕获错误 */
demo().catch(err=>{
	console.log(err.message);
})

[[PromiseState]]: "rejected"
[[PromiseResult]]: TypeError: 类型错误
```

+ await可以理解为用于等待一个Promise对象或者任何要等待的值：
如果等待的是Promsie实例，那么会暂停当前async函数的执行，等待Promise内部状态发生改变，如果处理结果为成功那么resolve函数参数就是await表达式的值；如果处理结果为失败那么await会将Promise的异常原因抛出。
如果等待的是一个普通的JavaScript值，那么返回其值本身。

+ async - await 捕获异常的问题

> 如果异常是同步抛出的，trycatch可以捕获
```js
async function init() {
	try {
		const userScore = await new Promise((resolve, reject) => {
			let userScore;
			throw new Error('1896');  
		});

	} catch (e) {
		console.log(e); // Error: 1896
	}
}
init();

```

> 如果异常在异步代码中抛出，那么try catch不可以捕获

```js
async function init() {
	try {
		const userScore = await new Promise((resolve, reject) => {
			let userScore;
			setTimeout(() => {
				userScore = 100;
				throw new Error('1896');
			}, 1500)
			
		});

	} catch (e) {
		console.log(e); // 并不能捕获到异常
	}
}
init();

```