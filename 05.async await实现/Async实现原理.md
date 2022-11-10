## Async实现原理
上面我们已经可以用co库+generator函数来实现异步代码同步管理了
但是要借助于第三方库co，所以我们还可以再简化下
+ 把generator函数的*变为async
+ 把generator函数内部的yield变为await

babel中：
_asyncGenerator函数：接收一个async函数作为参数，返回一个generator函数
执行这个返回的generator函数，会返回一个promise实例 
promise实例内部有一个_next方法 就是来实现异步迭代的
 
分析bable转化async和await源码发现，它其实就是co函数+generator函数的语法糖
1. async函数的返回值是一个Promise,如果我们显式的使用return一个普通值，那么等于返回了将这个普通值包装后的promise。
2. 出现await 就代表等待await后面的那个异步请求返回结果，如果返回了那么就将结果拿到，再接着向下执行
3. await一般情况下是串行的，如果要实现并行，那么应该是await Promise.all()等待多个并行请求返回结果之后再去执行下一步
4. await后面直接跟上一个定时器，如果它没有被promise包裹那么只代表await了一个定时器的返回值timer，而不是等定时器内部执行后再去执行下面的代码

```js
async function read() {
	let AFileContent = await readFile('../a.txt', 'utf-8');
	let BFileContent = await readFile(AFileContent, 'utf-8');
	return BFileContent;
}
console.log("read: ",read());

read().then(data => {
	console.log("data: ", data); // data:bbbb
}).catch(err =>{
	console.log("err: ",err);
})
```

其实就等价于：
```js
function *read{
	let AFileContent = yield readFile('../a.txt', 'utf-8');
	let BFileContent = yield readFile(AFileContent, 'utf-8');
	return BFileContent;
}

function co(iterator) {
	return new Promise((resolve, reject) => {
		// 异步迭代 只能采用递归方法调用 
		// 同步迭代 可以采用for、while等循环
		function next(data) {
			let {
				value,
				done
			} = iterator.next(data);
			console.log(value,done);
			if (done) {
				resolve(value);
			} else {
				/* 
					yield返回的可能是普通值也可能是promise
					为了可以统一执行then方法将其转化为promsie函数
				 */
				Promise.resolve(value).then(res => {
					next(res);
				}).catch(err => {
					reject(err);
				})
			}
		}
		next();
	})
}

co(read()).then(data => {console.log("data: ", data)}
```