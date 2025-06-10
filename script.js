// 単語データは外部ファイルから読み込むため、ここでは定義しない
let wordData = []; // 初期化
let chapterData = {}; // 章とそれに属する単元の情報を格納するオブジェクト

// アプリの要素を取得
const selectionArea = document.querySelector('.selection-area');
const chaptersContainer = document.querySelector('.chapters-container');
const startButton = document.getElementById('startButton');
const cardArea = document.querySelector('.card-area');
const questionText = document.getElementById('question');
const answerText = document.getElementById('answer');
const toggleButton = document.getElementById('toggleButton');
const nextButton = document.getElementById('nextButton');
const messageText = document.getElementById('message');
const backToSelectionButton = document.getElementById('backToSelectionButton');

// 新規取得: 進捗表示、正誤判定ボタン、結果エリア関連
const progressText = document.getElementById('progressText'); // 進捗表示
const correctButton = document.getElementById('correctButton'); // 分かったボタン
const incorrectButton = document.getElementById('incorrectButton'); // 分からなかったボタン
const resultsArea = document.querySelector('.results-area'); // 結果表示エリア
const resultSummary = document.getElementById('resultSummary'); // 結果サマリー
const incorrectWordsList = document.getElementById('incorrectWordsList'); // 間違えた単語リスト
const restartLearningButton = document.getElementById('restartLearningButton'); // 結果画面からの再学習ボタン
const backToSelectionFromResults = document.getElementById('backToSelectionFromResults'); // 結果画面からの範囲選択に戻るボタン


// 出題数選択ラジオボタンの取得
const questionCountRadios = document.querySelectorAll('input[name="questionCount"]');

let currentWordIndex = 0;
let selectedWords = []; // 選択された単元からフィルタリングされた全単語
let wordsForQuiz = []; // 実際にクイズに出題する単語（出題数で調整されたもの）
let isQuestionDisplayed = true; // 現在問題が表示されているか (答えが隠れているか)
let correctAnswersCount = 0; // 正解した単語の数
let incorrectWords = []; // 間違えた単語を格納する配列

// ----------------------------------------------------
// 初期化処理：DOMが読み込まれたら単語データを読み込む
// ----------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
    fetch('words.csv')
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.text();
        })
        .then(csvText => {
            wordData = parseCSV(csvText);
            // chapterDataを構築
            chapterData = buildChapterData(wordData);
            
            // データの読み込みと準備が完了したら、カテゴリ選択肢を生成
            generateChapterSelection();
            // ローカルストレージから前回の選択状態を復元
            loadSelectionFromLocalStorage();
        })
        .catch(error => {
            console.error('単語データの読み込みに失敗しました:', error);
            messageText.textContent = '単語データの読み込みに失敗しました。';
            messageText.style.color = '#e74c3c';
        });
});

// ----------------------------------------------------
// UI生成関数 (buildChapterDataは変更なし)
// ----------------------------------------------------

function buildChapterData(data) {
    const chapters = {};
    data.forEach(word => {
        const chapterNum = word.chapter;
        const unitNum = word.number;
        const unitCategory = word.category;

        if (!chapters[chapterNum]) {
            chapters[chapterNum] = {
                units: {},
                words: []
            };
        }
        if (!chapters[chapterNum].units[unitNum]) {
            chapters[chapterNum].units[unitNum] = {
                categoryName: unitCategory,
                words: []
            };
        }
        chapters[chapterNum].units[unitNum].words.push(word);
        chapters[chapterNum].words.push(word);
    });

    const sortedChapters = Object.keys(chapters).sort((a, b) => parseInt(a) - parseInt(b));
    const sortedChapterData = {};
    sortedChapters.forEach(chapterNum => {
        sortedChapterData[chapterNum] = chapters[chapterNum];
        const sortedUnitNumbers = Object.keys(chapters[chapterNum].units).sort((a, b) => parseInt(a) - parseInt(b));
        const sortedUnits = {};
        sortedUnitNumbers.forEach(unitNum => {
            sortedUnits[unitNum] = chapters[chapterNum].units[unitNum];
        });
        sortedChapterData[chapterNum].units = sortedUnits;
    });

    return sortedChapterData;
}


// 章と単元の選択肢を生成する関数 (変更なし)
function generateChapterSelection() {
    chaptersContainer.innerHTML = ''; // 既存の内容をクリア

    for (const chapterNum in chapterData) {
        const chapter = chapterData[chapterNum];

        const chapterItem = document.createElement('div');
        chapterItem.className = 'chapter-item';
        chapterItem.dataset.chapterNum = chapterNum;

        const chapterHeader = document.createElement('div');
        chapterHeader.className = 'chapter-header';
        chapterHeader.innerHTML = `
            <span class="chapter-title">第${chapterNum}章</span>
            <div class="chapter-options">
                <button class="select-all-chapter-btn" data-chapter="${chapterNum}">全て選択</button>
                <span class="toggle-icon">▶</span>
            </div>
        `;
        chapterItem.appendChild(chapterHeader);

        const unitList = document.createElement('div');
        unitList.className = 'unit-list';
        
        for (const unitNum in chapter.units) {
            const unit = chapter.units[unitNum];
            const unitItem = document.createElement('div');
            unitItem.className = 'unit-item';
            unitItem.innerHTML = `
                <input type="checkbox" id="unit-${chapterNum}-${unitNum}" value="${unitNum}" data-chapter="${chapterNum}">
                <label for="unit-${chapterNum}-${unitNum}">${unitNum}. ${unit.categoryName}</label>
            `;
            unitList.appendChild(unitItem);
        }
        chapterItem.appendChild(unitList);
        chaptersContainer.appendChild(chapterItem);

        // イベントリスナーを追加
        chapterHeader.addEventListener('click', (event) => {
            if (!event.target.closest('.select-all-chapter-btn')) {
                chapterHeader.classList.toggle('expanded');
            }
        });

        const selectAllButton = chapterHeader.querySelector('.select-all-chapter-btn');
        selectAllButton.addEventListener('click', (event) => {
            event.stopPropagation();

            const allUnitCheckboxes = chapterItem.querySelectorAll('.unit-list input[type="checkbox"]');
            const isAllChecked = Array.from(allUnitCheckboxes).every(cb => cb.checked);

            allUnitCheckboxes.forEach(checkbox => {
                checkbox.checked = !isAllChecked;
            });
        });
    }
}


// ----------------------------------------------------
// イベントリスナーの追加
// ----------------------------------------------------

startButton.addEventListener('click', () => {
    const selectedUnitNumbers = Array.from(document.querySelectorAll('.unit-list input[type="checkbox"]:checked'))
                                           .map(checkbox => checkbox.value);
    
    if (selectedUnitNumbers.length === 0) {
        alert('出題範囲（単元）を一つ以上選択してください。');
        return;
    }

    selectedWords = wordData.filter(word => selectedUnitNumbers.includes(word.number));
    
    if (selectedWords.length === 0) {
        alert('選択された範囲に単語がありません。');
        return;
    }

    // 出題数を取得
    let selectedCount = document.querySelector('input[name="questionCount"]:checked').value;
    
    // 選択された単元と出題数をローカルストレージに保存
    saveSelectionToLocalStorage(selectedUnitNumbers, selectedCount);

    // selectedWordsをシャッフル
    shuffleArray(selectedWords);

    // 出題数に基づいてwordsForQuizを調整
    if (selectedCount === 'all') {
        wordsForQuiz = [...selectedWords]; // 全問
    } else {
        const count = parseInt(selectedCount, 10);
        wordsForQuiz = selectedWords.slice(0, count); // 指定された数だけ抽出
        if (wordsForQuiz.length < count) {
            // 選択された単語が指定数より少ない場合
            alert(`選択された単語が${count}問に満たないため、${wordsForQuiz.length}問出題します。`);
        }
    }

    currentWordIndex = 0;
    correctAnswersCount = 0; // 正答数をリセット
    incorrectWords = []; // 間違えた単語リストをリセット

    selectionArea.style.display = 'none';
    resultsArea.style.display = 'none'; // 結果エリアが表示されていたら非表示にする
    cardArea.style.display = 'flex';

    displayCurrentWord();
});

toggleButton.addEventListener('click', () => {
    if (isQuestionDisplayed) {
        // 答えを表示
        answerText.classList.remove('hidden');
        toggleButton.textContent = '隠す';
        isQuestionDisplayed = false;
        // 答えを見たので正誤判定ボタンと次の問題ボタンを表示
        correctButton.style.display = 'inline-block';
        incorrectButton.style.display = 'inline-block';
        nextButton.style.display = 'none'; // 次の問題は正誤判定後に押させる
    } else {
        // 答えを隠す
        answerText.classList.add('hidden');
        toggleButton.textContent = '答えを見る';
        isQuestionDisplayed = true;
        // 答えを隠したので正誤判定ボタンと次の問題ボタンを非表示
        correctButton.style.display = 'none';
        incorrectButton.style.display = 'none';
        // (厳密にはここでは次の問題ボタンは表示しない。正誤判定後の状態に戻すだけ)
    }
});

// 正誤判定ボタンのイベントリスナー
correctButton.addEventListener('click', () => {
    correctAnswersCount++; // 正答数をインクリメント
    moveToNextQuestion();
});

incorrectButton.addEventListener('click', () => {
    incorrectWords.push(wordsForQuiz[currentWordIndex]); // 間違えた単語を記録
    moveToNextQuestion();
});


// 次の単語へ進む共通ロジック
function moveToNextQuestion() {
    currentWordIndex++;
    if (currentWordIndex < wordsForQuiz.length) {
        displayCurrentWord();
    } else {
        // 全ての単語が終了した場合
        showResults();
    }
}


// 新規追加：範囲選択に戻るボタンのイベントリスナー
backToSelectionButton.addEventListener('click', () => {
    cardArea.style.display = 'none';
    selectionArea.style.display = 'block';
    messageText.textContent = ''; // メッセージをクリア
});

// 新規追加：結果画面からの「もう一度学習する」ボタン
restartLearningButton.addEventListener('click', () => {
    // startButton と同じロジックを呼び出すか、直接処理を記述
    // ここでは、現在の選択範囲と出題数で再学習を開始する
    startButton.click(); // startButtonのクリックイベントを発火させる
});

// 新規追加：結果画面からの「範囲選択に戻る」ボタン
backToSelectionFromResults.addEventListener('click', () => {
    resultsArea.style.display = 'none'; // 結果エリアを非表示
    selectionArea.style.display = 'block'; // 選択エリアを表示
    messageText.textContent = ''; // メッセージをクリア
});

// ----------------------------------------------------
// ヘルパー関数
// ----------------------------------------------------

// ローカルストレージに選択状態を保存する関数
function saveSelectionToLocalStorage(selectedUnitNumbers, selectedCount) {
    localStorage.setItem('selectedUnits', JSON.stringify(selectedUnitNumbers));
    localStorage.setItem('questionCount', selectedCount);
}

// ローカルストレージから選択状態を読み込む関数
function loadSelectionFromLocalStorage() {
    const savedUnits = localStorage.getItem('selectedUnits');
    const savedCount = localStorage.getItem('questionCount');

    if (savedUnits) {
        const selectedUnitNumbers = JSON.parse(savedUnits);
        // 保存された単元をチェックボックスに反映
        document.querySelectorAll('.unit-list input[type="checkbox"]').forEach(checkbox => {
            checkbox.checked = selectedUnitNumbers.includes(checkbox.value);
        });
        // 必要に応じて、章を自動的に展開するかどうかを検討
        // 例: 選択されている単元を含む章を展開する
        selectedUnitNumbers.forEach(unitNum => {
            const checkbox = document.getElementById(`unit--${unitNum}`); // IDは一意にする必要がある
            if (checkbox) {
                const chapterItem = checkbox.closest('.chapter-item');
                if (chapterItem) {
                    chapterItem.querySelector('.chapter-header').classList.add('expanded');
                }
            }
        });
    }

    if (savedCount) {
        // 保存された出題数をラジオボタンに反映
        document.querySelectorAll('input[name="questionCount"]').forEach(radio => {
            if (radio.value === savedCount) {
                radio.checked = true;
            }
        });
    }
}


function displayCurrentWord() {
    const currentWord = wordsForQuiz[currentWordIndex];
    questionText.textContent = currentWord.question;
    answerText.textContent = currentWord.answer;
    answerText.classList.add('hidden'); // 答えは常に隠す
    toggleButton.textContent = '答えを見る';
    isQuestionDisplayed = true;
    messageText.textContent = '';

    // 正誤判定ボタンと次の問題ボタンの表示をリセット
    correctButton.style.display = 'none';
    incorrectButton.style.display = 'none';
    nextButton.style.display = 'none'; // 通常の「次の問題へ」は非表示にする
    toggleButton.style.display = 'inline-block'; // 答えを見るボタンは常に表示

    // 進捗表示を更新
    progressText.textContent = `${currentWordIndex + 1} / ${wordsForQuiz.length} 問`;
}

// 学習結果を表示する関数
function showResults() {
    cardArea.style.display = 'none';
    resultsArea.style.display = 'block';

    const totalQuestions = wordsForQuiz.length;
    const correctPercentage = totalQuestions > 0 ? ((correctAnswersCount / totalQuestions) * 100).toFixed(1) : 0;

    resultSummary.innerHTML = `全 ${totalQuestions} 問中、**${correctAnswersCount} 問** 正解しました。<br>正答率: **${correctPercentage}%**`;

    incorrectWordsList.innerHTML = ''; // リストをクリア
    if (incorrectWords.length > 0) {
        incorrectWords.forEach(word => {
            const listItem = document.createElement('li');
            listItem.innerHTML = `**${word.question}** - ${word.answer}`;
            incorrectWordsList.appendChild(listItem);
        });
    } else {
        const listItem = document.createElement('li');
        listItem.textContent = '間違えた単語はありません！素晴らしい！';
        incorrectWordsList.appendChild(listItem);
    }
    // メッセージもクリアしておく
    messageText.textContent = '';
}


function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

// CSVテキストをパースしてオブジェクトの配列に変換する関数 (変更なし)
function parseCSV(csvText) {
    const lines = csvText.trim().split('\n');
    const headers = lines[0].split(',').map(header => header.trim());

    const result = [];
    for (let i = 1; i < lines.length; i++) {
        if (lines[i].trim() === '') continue;
        const values = parseCSVLine(lines[i]);
        const obj = {};
        for (let j = 0; j < headers.length; j++) {
            obj[headers[j]] = values[j] ? values[j].trim() : '';
        }
        result.push(obj);
    }
    return result;
}

// CSVの行を適切にパースする（カンマを含む値に対応） (変更なし)
function parseCSVLine(line) {
    const values = [];
    let inQuote = false;
    let currentVal = '';

    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
            if (inQuote && i + 1 < line.length && line[i + 1] === '"') {
                currentVal += '"';
                i++;
            } else {
                inQuote = !inQuote;
            }
        } else if (char === ',' && !inQuote) {
            values.push(currentVal);
            currentVal = '';
        } else {
            currentVal += char;
        }
    }
    values.push(currentVal);
    return values;
}
