## 使用Generator为对象添加迭代器
首先思考一个问题：类数组如何可以被展开，也就是类数组如何被遍历?
```js
const arrayLike = {
  0: "a",
  1: "b",
  2: "c",
  length: 3,
};

console.log([...arrayLike]); // TypeError: object is not iterable

```

我们可以基于[Symbol.iterator]来实现一个默认的迭代器：
```js
/* 原生实现让对象可以被迭代 */
const arrayLike1 = {
  0: "a",
  1: "b",
  2: "c",
  length: 3,
};
// 规定遍历器函数必须返回一个对象，对象必须有一个next方法，执行next方法必须返回一个属性为done和value的对象，如果done为true遍历停止执行。
arrayLike1[Symbol.iterator] = function () {
  let i = 0;
  return {
    next: () => {
      return {
        value: this[i],
        done: i++ === this.length,
      };
    },
  };
};
console.log([...arrayLike1]); // [ 'a', 'b', 'c' ]
```

使用生成器函数实现：因为生成器函数默认生成的就是遍历器
```js
const arrayLike2 = {
  0: "a",
  1: "b",
  2: "c",
  length: 3,
};
arrayLike2[Symbol.iterator] = function* () {
  let i = 0;
  while (i < this.length) {
    yield this[i++];
  }
};

console.log([...arrayLike2]); // [ 'a', 'b', 'c' ]
/* 
	类数组转数组：
	1. Array.from(arrayLike); 直接将类数组转为数组
	2. [...arrayLike]; 需要类数组有遍历器接口
	3. [].slice.call(arrayLike); 
 */

```

当我们在[...obj]的时候，其实就是在：
1. 取出obj上的迭代器也就是[Symbol.iterator]属性对应的函数iterator
2. 调用这个iterator函数拿到一个迭代器it
3. 利用一个while循环和一个外部变量，不停的去调用这个it上的next方法
4. 调用next方法会得到value和done，将value不断的存起来，当done为true的时候，停止while循环即可
5. 返回value组成的集合数组
```js
*/
function* read() {
  yield "id-08";
  yield "score-100";
  yield "rank-06";
}

// 下面等于在实现...这个运算符内部是如何实现迭代可迭代对象的
const it = read();
let call = false;
do {
  let { value, done } = it.next();
  console.log("value-done", value, done);
  call = done;
} while (!call);

// value-done id-08 false
// value-done score-100 false
// value-done rank-06 false
// value-done undefined true
```
## Generator函数将函数中止执行
Generator函数可以实现JS的元编程，比如通过Generator函数让一个原本不可以迭代的对象变得可以迭代，就是给其他非迭代对象添加迭代器接口.
Generator函数还具有将函数中止执行的功能，redux-saga里面用到了Generator函数,Generator函数还有一个就是可以解决回调地狱的问题。

```js
/* 
	ES6语法规定：
	每次执行next方法的时候可以传入参数，第一个传入的参数总是无效的；
	后续每一次调用next方法传入的参数都会被当做上一个yield表达式的返回值
 */
function* read() {
  const v1 = yield "id-08";
  console.log("v1", v1);

  const v2 = yield "score-100";
  console.log("v2", v2);

  const v3 = yield "rank-06";
  console.log("v3", v3);

  return v3;
}

const it = read();
console.log(it.next("无效的参数"));
console.log(it.next("100"));
console.log(it.next("200"));
```
知道以上这个next方法传参的特性，我们就可以基于Generator来实现一个异步请求串行的问题了，虽然还是有嵌套，但是至少有了用处:

```js
function getId() {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      resolve({ id: "008" });
    }, 1000);
  });
}

function getScore(id) {
  console.log(`获取到id是${id}，模拟发起获取分数的请求`);
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      resolve({ score: 100 });
    }, 1000);
  });
}

getId()
  .then((data) => {
    const { id } = data;
    return getScore(id);
  })
  .then((data) => {
    const { score } = data;
    console.log("最终得到的分数是：", score);
  });

/* 
	把以上串行的请求使用Generator进行改造：
*/
function getId() {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      resolve({ id: "008" });
    }, 1000);
  });
}

function getScore(id) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      resolve({ score: 100 });
    }, 1000);
  });
}

// 发起请求
function* request() {
  try {
    const { id } = yield getId();
    const { score } = yield getScore(id);
    return score;
  } catch (error) {
    console.log("Generator执行错误", error);
  }
}

const it = request();
let { value, done } = it.next(); // 首次执行不传递参数

value.then((data1) => {
  console.log(`获取到id是${data1.id}，模拟发起获取分数的请求`);
  let { value, done } = it.next(data1.id);

  value.then((data2) => {
    // 可以在外部手动抛出异常 从而控制Generator内部的走向 就像在同步代码中捕获异常
    // it.throw('error');

    console.log("最终得到的分数是", data2.score);
    let { value, done } = it.next(data2.score);
    console.log("value&done", value, done); // undefined true
  });
});
```
到这里你可能会说这又什么用啊？
我直接用promsie.then.then不就好了？但是你有没有发现，之前我们发起请求的代码都需要嵌套来写，比如，它虽说是将回调嵌套扁平化，但是核心还是一个异步的嵌套写法，并没有根本性的改变：
```js
getId().then((data)=>{
		const {id} = data;
		return getScore(id);
	}).then((data)=>{
		const {score} = data;
		console.log('最终得到的分数是：',score);
	})
```
但是现在借用Generator可暂停执行以及next传参的特点：我们发起请求的代码采用了同步管理的方式来写：
```js
function * request(){
		const {id} = yield getId();
		const {score} = yield getScore(id);
		return score;
	}
```
这一看就知道已经有点async和await内味儿了？但是现在我们还需要一直调用next方法然后then里面接着调用next方法才可以实现需求,如果我们可以调用request方法直接既可以完成串行异步请求，又可以返回最后return的值该多好啊，比如：
```js
request().then((res)=>{
		console.log(res); // res就是最终return的score-100
	})
```
很幸运，有一个库co帮助我们实现了这个需求：
```js
const co = require("co");
function getId() {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      resolve({ id: "008" });
    }, 1000);
  });
}

function getScore(id) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      resolve({ score: 100 });
    }, 1000);
  });
}

// 发起请求
function* request() {
  const { id } = yield getId();
  const { score } = yield getScore(id);
  return score;
}

co(request()).then((res) => {
  console.log(res); // res就是最终return的score-100
});
```

## co自动执行器的实现
我们如何自己实现一个co函数呢？
	很重要的思想：只要异步迭代的实现，都离不开递归 + 回调函数 + 初次启动
```js
function co(it) {
  return new Promise((resolve, reject) => {
    // 只要实现异步迭代 就基于递归调用回调函数next实现并且让next先执行一次
    function next(data) {
      let { value, done } = it.next(data);
      console.log(value, done);

      if (done) {
        // done为true的时候 返回成功态的promsie
        resolve(value);
      } else {
        // 不管value是否为promsie 都包装成为promise的实例 便于后续then
        Promise.resolve(value).then(
          (data) => {
            // 递归调用
            next(data);
          },
          (err) => {
            reject(err);
          }
        );
      }
    }

    // 启动器 首次传入undefiend进去
    next();
  });
}
```
co函数可以简化为：
将内部的promise进一步进行简化，成功直接执行next并将参数传入next
```js
function co(it) {
  return new Promise((resolve, reject) => {
    function next(data) {
      let { value, done } = it.next(data);
      if (done) {
        resolve(value);
      } else {
        Promise.resolve(value).then(next, reject);
      }
    }
    next();
  });
}

function getId() {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      resolve({ id: "008" });
    }, 1000);
  });
}

function getScore(id) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      resolve({ score: 100 });
    }, 1000);
  });
}

// 基于generator发起请求
function* request() {
  const { id } = yield getId();
  const { score } = yield getScore(id);
  return score;
}
// 利用co函数将generator函数分步执行 并且拿到return的结果
co(request()).then((score) => {
  console.log("score", score);
});
```