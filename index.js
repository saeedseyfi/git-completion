#!/usr/bin/env node

const fs = require('fs');
const argv = require('yargs').argv;
const download = require('download');
const prompt = require('prompt');
const homedir = require('os').homedir();
const exec = require('child_process').exec;

function ask(question) {
    return new Promise((resolve, reject) => {
        console.log(question);
        prompt.get([{
            name: 'answer',
            description: 'yes/no',
            type: 'string',
            required: true,
            conform: function (answer) {
                return answer === 'yes' || answer === 'no';
            }
        }], function (err, result) {
            if (err) reject(err)
            else resolve(result.answer === 'yes');
        });
    });
}

function getGitVersion() {
    return new Promise((resolve, reject) => {
        exec('git --version', (err, stdout) => {
            if (err)
                reject(err);
            else
                resolve(stdout.replace(/[^0-9.]/g, ''));
        });
    });
}

function downloadAndWriteFile(src, dist) {
    return new Promise((resolve, reject) => {
        download(src)
            .then(data => {
                fs.writeFile(dist, data, err => {
                    if (err) reject(err)
                    else resolve()
                });
            })
            .catch(err => {
                console.log('Download failed :(', src);
                reject(err);
            });
    })
}

function promptIfFileExists(file) {
    return new Promise((resolve, reject) => {
        fs.exists(file, alreadyExists => {
            if (alreadyExists) {
                ask(`${file} already exists, override the old file?`)
                    .then(resolve)
                    .catch(reject)
            } else {
                resolve(true);
            }
        })
    });
}

async function install(file) {
    const downloadUrl = 'https://raw.githubusercontent.com/git/git/v#VERSION#/contrib/completion/git-completion.bash'
    const gitVersion = await getGitVersion();

    console.log(`git version ${gitVersion} detected.\nDownloading related git-completion bash....`);

    if (await promptIfFileExists(file)) {
        downloadAndWriteFile(downloadUrl.replace('#VERSION#', gitVersion), file)
            .then(() => {
                console.log('Done. Now you can put the following code in your .bashrc/.bash_profile to make it working:');
                console.log('\x1b[36m%s\x1b[0m', `source ${file}`);
            }).catch(err => console.trace(err));
    }
}

function uninstall(file) {
    ask(`${file} is going to be removed, sure?`)
        .then(answer => {
            if (answer) {
                fs.unlink(file, err => {
                    if (err) throw err;
                    console.log('Done. Now you should remove the following code from your .bashrc/.bash_profile:');
                    console.log('\x1b[36m%s\x1b[0m', `source ${file}`);
                });
            }
        })
        .catch(err => {
            throw err;
        })
}

const gitCompletionPath = argv.f || `${homedir}/git-completion.bash`;

switch (argv._[0]) {
    case 'install':
        install(gitCompletionPath);
        break;
    case 'uninstall':
        uninstall(gitCompletionPath);
        break;
    default:
        console.log('Command not recognized.\nAvailable commands: install, uninstall');
}
