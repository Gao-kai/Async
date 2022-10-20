## AOP编程
 AOP编程的意思是面向切面编程，它的核心思想是把一些和核心业务、逻辑模块无关的功能代码抽取出来，然后将这些抽离出来的功能模块通过动态植入的方法加入到业务模块中。
 
 这样做的好处是保持业务核心模块的纯净和高内聚性，其次是方便复用这些提取出来的功能模块。
 
 ## 高阶函数实现AOP
在JS中实现AOP编程，指的就是把一个函数动态植入到另外一个函数中，由于JS的函数天然就可以将函数当做参数传入，所以实现是很方便的，这里为了保证函数的统一性，我们采用原型链编程的方法，给每一个函数实现一个before方法和after方法，意思就是用户在调用某个目标函数的时候想要在该函数执行前和执行后都做一些事情。

比如我们要实现一个两数相加的功能，也就是目标函数为add：
```js
function add(a,b){
	console.log(a+b);
}
```
现在我希望在add函数每次计算之前打印a-b的值，在计算之后打印a*b的值，一般情况下我们可能这样实现：
```js
function del(a,b){
	console.log(a-b);
}

function mul(a,b){
	console.log(a*b);
}

function add(a,b){
	// 计算之前执行
	del(a,b);
	
	// 核心代码
	console.log(a+b);
	
	// 计算之后执行
	mul(a,b);
}
```
看的出来，这样做法将原目标函数add内部的逻辑进行了修改，如果此函数是一个核心模块的函数，这个方法被多处调用，那么其他人在调用的时候也无可避免的要执行我植入进去的before和after逻辑，因此我们需要对此方法进行解耦和重构。

```js
function core(a,b,c){
	console.log('函数执行核心逻辑:计算参数之和');
	return a+b+c;
}

function consoleParams(...args){
	console.log('函数执行前的操作，打印参数数组',args);
}

Function.prototype.before = function(beforeFn){
	let that = this;
	return function(...args){
		// 首先执行beforeFn
		beforeFn.apply(this,args);
		// 然后执行核心逻辑 并将执行的结果返回
		return that.apply(this,args);
	}
}

let beforeCore = core.before(consoleParams);
let total= beforeCore(10,20,70);
console.log('计算的结果',total);

```

同理我们可以很轻松的实现after方法：
```js
function report(result){
	console.log('函数执行后的操作,向服务器上报函数执行结果为',result);
}

Function.prototype.after = function(afterFn){
	let that = this;
	return function(...args){
		// 保存core函数执行结果
		let res = that.apply(this,args);
		// 执行afterFn
		afterFn.apply(this,args);
		// 返回core函数执行结果
		return res;
	}
	
}

let afterCore = core.after(report);
let total2= afterCore(10,20,70);
console.log('计算的结果',total);
```

由于before和after方法的返回值都是函数，它们的参数也都是函数，而且都是Function原型上的方法，所以可以进行链式调用：
```js
function del(a,b){
	console.log(a-b);
}

function mul(a,b){
	console.log(a*b);
}

function add(a,b){
	// 核心代码
	console.log(a+b);
}

let func = add.before(del).after(mul);
func(10,20);
/* 
 依次打印：-10,30和200,实现了功能的解耦
 */

```

基于高阶函数实现AOP编程的好处在于：
1. 别人调用core目标函数的时候逻辑不会发生任何变化
2. 调用者想要拓展core函数的时候，比如在调用前后要植入自己的逻辑的时候，就可以先把要执行的逻辑封装在单独的函数里，然后通过core.before或者after的方法植入
3. 实现了核心逻辑和无关联逻辑的解耦，提高核心函数的内聚性