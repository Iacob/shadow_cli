
const https = require('node:https');
// const http = require('node:http');
const yaml = require('js-yaml');
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

https.get(url1, { headers: { 'user-agent': 'clash' } }, (res) => {
  console.log('statusCode:', res.statusCode);
  console.log('headers:', res.headers);
  res.on('data', (d) => {
    content += d
    //process.stdout.write(d);
    //console.log('-----');
  });
  res.on('close', () => {
    console.log(content);

    loadServerListFromYamlStr(content);
    showServerList();
    // console.log(decodeBase64(content));
    
    // const urlListStr = decodeBase64(content);
    // const urlList = parseUrlList(urlListStr);
    // serverList.push(...urlList);
    // for (item of serverList) {
    //   console.log(item.lineNum, ' -> ', '[', item.info?.protocol, ']', item.info?.name);
    // }

    startWaitUserInput();
  })
}).on('error', (e) => {
  console.error(e);
});

function loadServerListFromYamlStr(yamlStr) {
  const yamlObj = yaml.load(yamlStr);
  let serverList1 = yamlObj?.proxies || [];
  let lineNum = 0;
  serverList1 = serverList1.map(item => ({ lineNum: ++lineNum, ...item }))
  serverList.push(...serverList1);
  console.log('服务器列表: ', serverList);
}

function showServerList() {
  for (item of serverList) {
    console.log(item.lineNum, ' -> ', '[', item.type, ']', item.name);
  }
}

function startWaitUserInput() {
  console.log('请输入服务器序号: ');
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  rl.on('line', (userInput) => {
    if (userInput === 'list') {
      showServerList();
    } else {
      const lineNum = parseInt(userInput);
      const serverSelected = serverList.find(item => (lineNum === item.lineNum));
      console.log('选中服务器: ', serverSelected);
      if (serverSelected?.type === 'ss') {
	if (serverSelected) {
	  const serverInfo = serverSelected || {};
	  const cmd = `ss-local -s ${serverInfo.server} -p ${serverInfo.port} -k ${serverInfo.password} -m ${serverInfo.cipher} -l 8118`;
	  console.log('连接命令: ', cmd);
	  console.log('运行命令: ')
	  execSync(cmd, {stdio: 'inherit'});
	}
      } else if (serverSelected?.type === 'trojan') {
	if (serverSelected) {
	  const serverInfo = serverSelected;
	  const configObj = {
	    run_type: 'client',
	    local_addr: '127.0.0.1',
            local_port: 8118,
	    remote_addr: serverInfo.server,
	    remote_port: serverInfo.port,
	    password: [
	      serverInfo.password
	    ],
	    log_level: 1,
	    ssl: {
              verify: false,
              verify_hostname: false,
	      cert: '',
	      sni: serverInfo.sni,
              alpn: [
		'h2',
		'http/1.1'
              ],
              reuse_session: true,
              session_ticket: false,
              curves: ''
	    },
	    tcp: {
              no_delay: true,
              keep_alive: true,
              reuse_port: false,
              fast_open: false,
              fast_open_qlen: 20
	    }
	  }
	  console.log(serverInfo.name, ' 配置信息：');
	  console.log(JSON.stringify(configObj, null, '\t'));
	}
      }
    }
  }); 
}
