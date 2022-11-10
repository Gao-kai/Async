## finally
第一步：finally方法的返回值必须可以接着调用then，所以返回的一定是一个promsie
这里就是将finally转化为then方法，then方法的返回值就是一个新的promsie
```js
Promise.prototype.finally = function(onFinally){
	return this.then((res)=>{
		
	},(err)=>{
		
	})
}
```

第二步：无论成功 失败 finally方法的回调函数onFinally必须执行
```js
Promise.prototype.finally = function(onFinally){
	return this.then((res)=>{
		onFinally();
	},(err)=>{
		onFinally();
	})
}
```

第三步：如果onFinally执行的时候返回了一个新的promsie，那么需要等待这个promsie执行完毕

我们知道，在then的onFulfilled和onRejected中，如果显式的return了一个promsie，那么会调用resolvePromise递归的去解析这个promsie
此时会等待promsie执行完毕，所以这里选择return的方法来等待执行


```js
Promise.prototype.finally = function(onFinally){
	return this.then((res)=>{
		return onFinally();
	},(err)=>{
		return onFinally();
	})
}
```

第四步：如果finally方法的调用者promise的状态是成功，值为100. onFinally执行的结果是返回一个promsie，这个返回的promsie的状态也是成功，值是200
按照A+规范，onFinally的执行不应该影响最原始的调用者输出的值100，但如果按照现在的写法，那么要下一个then的时候输出值就是200，是不对的

怎么办呢？就要让Promise.resolve()包装一层，为什么要包装呢，不包装不是也会等待吗？如果别人传入的onFinally什么都不执行呢？那不是没法接着.then了
也就没法修改参数的走向了，保证它的兼容性
Promise.resolve()会等到内部的promsie执行完毕，然后返回一个promsie
我们继续对这个promsie.then，从而让最外层return出去的那个promise实例发生变化，这才是最核心的

```js
Promise.prototype.finally = function(onFinally){
	return this.then((value)=>{
		return Promise.resolve(onFinally()).then((n)=>{
			// 外部的promsie调用者结果向下传
			return value;
		},(m)=>{
			// Promise.resolve包装的promsie出错了 那就不要调用者抛出的错误了 用这个包装过的promsie的错误
			throw m;
		})
	},(reason)=>{
		return Promise.resolve(onFinally()).then((n)=>{
			// 外部的promsie调用者结果向下传
			throw reason;
		},(m)=>{
			throw m;
		})
	})
}
```