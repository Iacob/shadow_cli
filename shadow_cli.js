
const https = require('node:https');
const { Buffer } = require('node:buffer');
const readline = require('node:readline');
const { execSync } = require('node:child_process');

let cmdUrl = null;

try {
  cmdUrl = new URL(process.argv[process.argv.length - 1]);
} catch (err) {}

// const url1 = 'https://...';
const url1 = cmdUrl?.href;
if (!url1) {
  console.error('未提供URL');
  process.exit(1);
}

console.log('读取URL: ', url1);

let content = '';
const serverList = [];

https.get(url1, (res) => {
  console.log('statusCode:', res.statusCode);
  console.log('headers:', res.headers);
  res.on('data', (d) => {
    content += d
    //process.stdout.write(d);
    //console.log('-----');
  });
  res.on('close', () => {
    // console.log(content);
    // console.log(decodeBase64(content));
    const urlListStr = decodeBase64(content);
    const urlList = parseUrlList(urlListStr);
    serverList.push(...urlList);
    for (item of serverList) {
      console.log(item.lineNum, ' -> ', item.info?.name);
    }

    startWaitUserInput();
  })
}).on('error', (e) => {
  console.error(e);
});


function decodeBase64(str) {
  const buf1 = Buffer.from(str, 'base64');
  return buf1.toString();
}

function parseUrlList(str) {
  if ((str || '').trim().length > 0) {
    const strList = (str || '').split("\n");
    const list1 = [];
    let lineNum = 0;
    for (str of strList) {
      console.log('正在解析: ', str);
      let url1 = null;
      try {
	url1 = new URL(str);
      } catch (err) {
	console.error('解析出错: ', err);
      }
      if (url1) {
	const itemObj = {
	  lineNum: ++lineNum,
	  url: url1,
	  src: str
	};
	if (url1.protocol === 'ss:') {
	  const authInfo = extractUserPassFromUrlAuthStr(url1.username);
	  itemObj.info = {
	    protocol: 'ss',
	    name: decodeURIComponent(url1.hash),
	    host: url1.hostname,
	    port: url1.port,
	    enc: authInfo.user,
	    pass: authInfo.pass,
	  };
	}

	console.log('->>>>', itemObj)
	list1.push(itemObj);
      }
    }
    return list1;
  } else {
    return [];
  }
}

function extractUserPassFromUrlAuthStr(str) {
  const buf1 = Buffer.from((str || ''), 'base64');
  const authInfo = buf1.toString();  
  const authInfoParts = (authInfo || '').split(':');
  return { user: authInfoParts[0], pass: authInfoParts[1] }
}

function startWaitUserInput() {
  console.log('请输入服务器序号: ');
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  rl.on('line', (userInput) => {
    if (userInput === 'list') {
      for (item of serverList) {
	console.log(item.lineNum, ' -> ', item.info?.name);
      }
    } else {
      const lineNum = parseInt(userInput);
      const serverSelected = serverList.find(item => (lineNum === item.lineNum));
      console.log('选中服务器: ', serverSelected);
      if (serverSelected?.info?.protocol === 'ss') {
	if (serverSelected?.info) {
	  const serverInfo = serverSelected.info;
	  const cmd = `ss-local -s ${serverInfo.host} -p ${serverInfo.port} -k ${serverInfo.pass} -m ${serverInfo.enc} -l 8118`;
	  console.log('连接命令: ', cmd);
	  console.log('运行命令: ')
	  execSync(cmd, {stdio: 'inherit'});
	}
      }
    }
  }); 
}
