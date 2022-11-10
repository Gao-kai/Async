## 一. Generator解决回调地狱问题的历史
最早一些浏览器中的api比如setTimeout，以及node中的api readFile等都是基于回调函数来实现的，但是只要是回调函数就会有可能出现回调地狱的问题

后来ES6新增了Promise优化了回调地狱的写法，但是并没有从根本上解决回调地狱的问题，要想从根本上解决回调地狱的问题，还是基于Generator来解决的。再到后来ES7新增了async和await语法 可以让我们以同步的方式去书写异步的代码，其实async就是Generator函数的语法糖。

Generator函数解决回调地狱的核心是Generator可以将函数的执行权交出去

## 二、ES6实现的Generator语法
1. Generator函数执行后返回的是一个Iterator对象，这个对象上一定有next方法
2. 每执行一次next方法，Generator函数里面的代码就会执行到yield的地方暂停执行，并且会将yield后面紧跟着的表达式的值当做value，当做本次调用next方法的返回值返回，这个返回值是一个对象，里面有value和done属性
3. 再次执行next方法，Generator函数里面的代码就会执行到下一个yield关键字的地方停止，还是一样将值返回；如果没有遇到yield了那么就返回{value:undefined,done:true}
4. 在调用next方法的时候可以传递参数，并且第一次调用next方法时传递的参数是没有任何意义的，往后每次传递的参数就会当做上一个yield表达式的返回值赋值过去。

```js
function* myGenerator() {
	const a = yield 1;
	console.log('a: ',a);
	const b = yield 2;
	console.log("b: ",b);
	const c = yield 3;
	console.log("c: ",c);
}

const myIt = myGenerator();

myIt.next('111');  // 执行到yield 1的地方,此时没有任何输出
myIt.next('222');  // 执行到yield 2的地方,此时将222传递给yield 1的返回值a，所以输出a：222
myIt.next('333');  // 执行到yield 3的地方,此时将333传递给yield 2的返回值b，所以输出b：333
myIt.next('444');  // 执行到结束，此时将444传递给yield 3的返回值c，所以输出c：444

```

## 三、bable转译后的代码
我们需要思考一个问题，带*的这种Generator函数是如何通过babel编译成为低版本浏览器代码的？也可以说Generator函数内部是如何实现的，为什么我们给一个函数加一个*之后就可以通过yield关键字来控制函数执行的流程呢？

babel转化的结果如下：
将带*的myGenerator函数转化成了一个不带*的同名myGenerator普通函数，执行这个不带*的同名myGenerator普通函数 其实本质是在执行regeneratorRuntime这个对象上的wrap方法。

wrap方法接收一个函数作为参数，返回的是一个it迭代器对象，这个迭代器对象上一定有一个next方法，每次执行next方法都会将传入的回调函数执行，执行回调函数的过程指针会移动，所以就会有每执行一次next方法返回一次结果的效果。

所以重点是搞明白regeneratorRuntime.wrap方法的执行流程。就搞懂了generator函数的执行流程。

```js
 function myGenerator() {
  var a, b, c;
  return regeneratorRuntime.wrap(function myGenerator$(_context) {
    while (1) {
      switch (_context.next) {
        case 0:
          _context.next = 2;
          return 1;

        case 2:
          a = _context.sent;
          console.log("a: ", a);
          _context.next = 6;
          return 2;

        case 6:
          b = _context.sent;
          console.log("b: ", b);
          _context.next = 10;
          return 3;

        case 10:
          c = _context.sent;
          console.log("c: ", c);

        case 12:
        case "end":
          return _context.stop();
      }
    }
  });
}

var myIt = myGenerator();
console.log("myIt: ",myIt);  // myIt:  { next: [Function (anonymous)] }
myIt.next("aaa");  // 有返回值 但是源代码中不打印
myIt.next("bbb");  // 有返回值 打印bbb
myIt.next("ccc");  // 有返回值 打印ccc
myIt.next("ddd");  // 有返回值 打印ddd
```

## 四、regeneratorRuntime.wrap方法的实现
在看了babel转译之后的代码后，发现关键点是这个wrap方法的实现，wrap也是一个高阶函数.执行不带*的myGenerator函数，其实就在执行wrap方法，只不过wrap方法的参数又是一个函数，这个函数就是babel转译实现的函数，它内部就是switch-case方法来实现有限状态机的

```js
let regeneratorRuntime = {};
regeneratorRuntime.wrap = function(fn){
	// 定义上下文对象，内部包含指针和done
	const context = {
		done:false, // 迭代器是否迭代完成
		next:0, // 初始指针
		// 调用stop方法的时候终止迭代
		stop:function(){
			this.done = true; 
		}
	}
	
	// 定义最终要返回的iterator对象 并部署next方法
	let it = {};
	
	/* 
		1. next方法执行的时候可以接受参数，用params标记
		2. 根据babel编译的结果看每执行一次next方法，就会将传入的fn执行一次，fn函数里面定义了指针对象的switch-case逻辑
		3. 执行fn方法的返回值value是next方法返回的对象中的value值
		4. 执行fn方法的时候会将上下文对象context对象传入，方便内部知道指针到哪里了
		5. 执行next方法的时候传入的参数params并不是当前yield表达式的返回值，而是会把这个参数赋值给上一次yield的返回值
	 */
	it.next = function(params){
		/* 
			第一次执行myIt.next("aaa");
			context.sent = aaa 
			value = fn(context) = >  _context.next = 2;  指针指向2
			 return 1; value = 1;
			返回给外面的对象是{value：1，done：false}
			此时实际代码执行到了 yield 1的位置，还没有完成给a赋值 所以什么都不打印
			
			第二次执行myIt.next("bbb");
			context.sent = bbb 
			value = fn(context) = >  a = _context.sent=bbb;打印bbb  
			  _context.next = 6;指针指向6 return 2 
			返回给外面的对象是{value：2，done：false}
			此时实际代码执行到了 yield 2的位置，a自然被打印
			
			第三次执行myIt.next("ccc");
			context.sent = ccc 
			value = fn(context) = >  b = _context.sent=ccc;打印ccc  
			  _context.next = 10;指针指向10 return 3
			返回给外面的对象是{value：3，done：false}
			此时实际代码执行到了 yield 3的位置，b自然被打印
			
			第四次执行myIt.next("ddd");
			context.sent = ddd 
			value = fn(context) = >  c = _context.sent=ddd;打印ddd  
			指针不变还是10 没有return 所以switch执行后面的每一个 
			直到执行到最后一个return _context.stop();
			执行 _context.stop(); 返回的是undefined 那么value确定 并且将done变为true
			返回给外面的对象是{value：undefined，done：true}
			此时实际代码已经执行完成
		 */
		context.sent = params;
		let value = fn(context);
		// 执行next方法一定返回一个包含value和done属性的对象 这是规定无法改变
		return {
			value,
			done:context.done
		}
	}
	
	
	// 返回的是一个iterator对象 上面有next方法
	return it;
}
```

## 五、实现next方法传递的值就是yield 表达式的返回值
一般来说当我们调用next方法传递参数的时候，第一次传递的参数往往是无效的，往后每一次传递的参数都会被直接当做上一个yield表达式的返回值，如果我们要实现第一次调用next方法传递的参数也有效，我们就要第一次传递一个undefined进去，然后将yield后面那个表达式的值保存起来，当做下一次调用next方法的参数，如下所示：
```js
function* myGenerator() {
	const a = yield 1;
	console.log('a: ', a);
	const b = yield 2;
	console.log("b: ", b);
	const c = yield 3;
	console.log("c: ", c);
}

let value = undefined;
let done = false;
const myIt = myGenerator();
do {
	let result = myIt.next(value);
	value = result.value;
	done = result.done;
} while (!done)
```

## 六、基于Generator来解决回调地狱问题
```js
const util = require('util');
const fs = require('fs');
const readFile = util.promisify(fs.readFile);

function * read(){
	let AFileContent = yield readFile('../a.txt','utf-8');
	let BFileContent  = yield readFile(AFileContent,'utf-8');
	return BFileContent;
}

const it = read();
let {value,done} = it.next();
value.then(res=>{
	console.log("读取A文件的结果是: ",res);
	// 将读取到的A文件结果res当做参数传递给下一次next调用 那么就等于给AFileContent赋值为res
	let {value,done} = it.next(res);
	
	value.then(res=>{
		console.log("读取B文件的结果是: ",res);
		// 将读到B文件结果res当做参数传递给下一次next调用 那么就等于给BFileContent赋值为res
		let {value,done} = it.next(res);
		console.log(value,done); // bbbb done代表迭代结束 Generator中的代码执行完毕
	})
},err=>{
	console.log("err: ",err);
})

```

## 七、基于co库解决写法的问题
上面这种Generator函数内部的写法已经可以将多个异步请求变成同步代码来写了,并且没有回调函数的嵌套.问题是在要拿到串行请求的最后的结果的时候,还是需要写嵌套的代码,这一点可以基于一个co库来解决
```js
const co = require('co');
co(read()).then(data=>{
	console.log("data: ",data); // data: bbbb 
})
```