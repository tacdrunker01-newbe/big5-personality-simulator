// State Management
let currentScores = {
    openness: 50,
    conscientiousness: 50,
    extraversion: 50,
    agreeableness: 50,
    neuroticism: 50
};
let currentGender = "male"; // male, female, nonbinary
let currentAge = 25; // 10 to 90
let characterDescription = "";
let selectedBg = "school";
let radarChart = null;
let debounceTimer = null;

// Background descriptions for the AI prompt
const backgroundInfo = {
    school: { name: "学校の教室", desc: "授業中または休み時間。周囲に同級生や教師の気配があり、少しガヤガヤしている。" },
    office: { name: "静かなオフィス", desc: "仕事時間中。タイピング音や電話の声が聞こえる。基本的に敬語やビジネストーン、または周囲の迷惑にならない静かな話し方。" },
    church: { name: "静まり返った教会", desc: "厳かで極めて静かな礼拝堂。大きな声は出せず、ヒソヒソ声や神聖で落ち着いた口調になる。" },
    factory: { name: "騒音の大きい工場", desc: "機械の稼働音が激しく響き渡る爆音の環境。大声で叫ばないと相手に声が届かない。" },
    izakaya: { name: "賑やかな居酒屋", desc: "お酒が入った賑やかでフレンドリーな空間。会話はくだけ、ややフランク・大雑把なトーンになる。" },
    custom: { name: "カスタム設定", desc: "" }
};

// UI Elements
const apiKeyInput = document.getElementById("apiKeyInput");
const apiModelSelect = document.getElementById("apiModelSelect");
const saveKeyBtn = document.getElementById("saveKeyBtn");
const apiBadge = document.getElementById("apiBadge");
const apiStatusText = document.getElementById("apiStatusText");
const randomizeBtn = document.getElementById("randomizeBtn");
const characterDescriptionTextarea = document.getElementById("characterDescription");
const descLoading = document.getElementById("descLoading");
const bgOptions = document.querySelectorAll(".bg-option");
const customBgContainer = document.getElementById("customBgContainer");
const customBgInput = document.getElementById("customBgInput");
const chatLog = document.getElementById("chatLog");
const chatForm = document.getElementById("chatForm");
const userInput = document.getElementById("userInput");
const typingIndicator = document.getElementById("typingIndicator");
const clearChatBtn = document.getElementById("clearChatBtn");
const ttsToggle = document.getElementById("ttsToggle");
const voiceSelect = document.getElementById("voiceSelect");
const sliderAge = document.getElementById("slider-age");
const generateDescBtn = document.getElementById("generateDescBtn");

// Big Five Sliders DOM elements
const sliders = {
    openness: document.getElementById("slider-openness"),
    conscientiousness: document.getElementById("slider-conscientiousness"),
    extraversion: document.getElementById("slider-extraversion"),
    agreeableness: document.getElementById("slider-agreeableness"),
    neuroticism: document.getElementById("slider-neuroticism")
};

// Initialize application
document.addEventListener("DOMContentLoaded", () => {
    initChart();
    loadApiKey();
    loadVoices();
    setupSliderListeners();
    setupGenderListeners();
    setupAgeListener();
    
    if (generateDescBtn) {
        generateDescBtn.addEventListener("click", () => {
            generateProfileDescription();
        });
    }
    
    randomizePersonality();
    
    // Web Speech API voices loading
    if (window.speechSynthesis) {
        window.speechSynthesis.onvoiceschanged = loadVoices;
    }
});

// Load API key from local storage
function loadApiKey() {
    const savedKey = localStorage.getItem("gemini_api_key");
    const savedModel = localStorage.getItem("gemini_api_model") || "gemini-3.5-flash";
    if (apiModelSelect) {
        apiModelSelect.value = savedModel;
    }
    if (savedKey) {
        apiKeyInput.value = savedKey;
        updateApiBadge(true);
    } else {
        updateApiBadge(false);
    }
}

// Save API Key
saveKeyBtn.addEventListener("click", () => {
    const key = apiKeyInput.value.trim();
    const model = apiModelSelect.value;
    localStorage.setItem("gemini_api_model", model);
    if (key) {
        localStorage.setItem("gemini_api_key", key);
        updateApiBadge(true);
        appendSystemMessage(`Gemini API設定を保存しました。モデル: ${model}。APIモードが有効です。`);
        // Re-generate profile text using AI if key was saved
        generateProfileDescription();
    } else {
        localStorage.removeItem("gemini_api_key");
        updateApiBadge(false);
        appendSystemMessage("APIキーを消去しました。ローカルモックモードに切り替わります。");
        generateProfileDescription(); // will trigger fallbackLocalDescription
    }
});

function updateApiBadge(hasKey) {
    if (hasKey) {
        apiBadge.classList.add("active");
        apiStatusText.textContent = "Gemini API Mode";
    } else {
        apiBadge.classList.remove("active");
        apiStatusText.textContent = "Local Mode";
    }
}

// Initialize Chart.js
function initChart() {
    const ctx = document.getElementById("radarChart").getContext("2d");
    radarChart = new Chart(ctx, {
        type: "radar",
        data: {
            labels: ["開放性", "誠実性", "外向性", "協調性", "神経症傾向"],
            datasets: [{
                data: [50, 50, 50, 50, 50],
                backgroundColor: "rgba(157, 78, 221, 0.15)",
                borderColor: "#9d4edd",
                borderWidth: 2,
                pointBackgroundColor: "#00f5d4",
                pointBorderColor: "#ffffff",
                pointHoverBackgroundColor: "#ffffff",
                pointHoverBorderColor: "#9d4edd",
                pointRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                r: {
                    angleLines: {
                        color: "rgba(255, 255, 255, 0.08)"
                    },
                    grid: {
                        color: "rgba(255, 255, 255, 0.08)"
                    },
                    pointLabels: {
                        color: "#a099b8",
                        font: {
                            size: 11,
                            family: "'Outfit', 'Noto Sans JP', sans-serif",
                            weight: "600"
                        }
                    },
                    ticks: {
                        color: "rgba(160, 153, 184, 0.6)",
                        backdropColor: "transparent",
                        font: {
                            size: 8
                        },
                        stepSize: 20
                    },
                    min: 0,
                    max: 100
                }
            },
            plugins: {
                legend: {
                    display: false
                }
            }
        }
    });
}

// Bind event listeners to Big Five sliders
function setupSliderListeners() {
    Object.keys(sliders).forEach(factor => {
        const slider = sliders[factor];
        if (slider) {
            // Live updates during drag
            slider.addEventListener("input", () => {
                updateScoresFromSliders();
                fallbackLocalDescription(); // update local description dynamically
            });
        }
    });
}

// Bind event listeners to Gender buttons
function setupGenderListeners() {
    const genderBtns = document.querySelectorAll(".gender-btn");
    genderBtns.forEach(btn => {
        btn.addEventListener("click", () => {
            genderBtns.forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            currentGender = btn.getAttribute("data-gender");
            fallbackLocalDescription(); // update local description dynamically
        });
    });
}

// Bind event listener to Age slider
function setupAgeListener() {
    if (sliderAge) {
        sliderAge.addEventListener("input", () => {
            currentAge = parseInt(sliderAge.value);
            document.getElementById("val-age").textContent = `${currentAge}歳`;
            fallbackLocalDescription(); // update local description dynamically
        });
    }
}

// Update state and chart from sliders (no API call)
function updateScoresFromSliders() {
    Object.keys(sliders).forEach(factor => {
        const val = parseInt(sliders[factor].value);
        currentScores[factor] = val;
        document.getElementById(`val-${factor}`).textContent = `${val}%`;
    });

    // Update Chart
    if (radarChart) {
        radarChart.data.datasets[0].data = [
            currentScores.openness,
            currentScores.conscientiousness,
            currentScores.extraversion,
            currentScores.agreeableness,
            currentScores.neuroticism
        ];
        radarChart.update();
    }
}

// Generate Random Personality Scores, Gender & Age
randomizeBtn.addEventListener("click", () => {
    randomizePersonality();
});

function randomizePersonality() {
    // Generate scores (0 - 100)
    currentScores = {
        openness: Math.floor(Math.random() * 86) + 15, // 15 to 100
        conscientiousness: Math.floor(Math.random() * 86) + 15,
        extraversion: Math.floor(Math.random() * 86) + 15,
        agreeableness: Math.floor(Math.random() * 86) + 15,
        neuroticism: Math.floor(Math.random() * 86) + 15
    };

    // Update sliders and text values in UI
    Object.keys(currentScores).forEach(factor => {
        const val = currentScores[factor];
        document.getElementById(`val-${factor}`).textContent = `${val}%`;
        if (sliders[factor]) {
            sliders[factor].value = val;
        }
    });

    // Randomize gender (45% male, 45% female, 10% nonbinary)
    const rand = Math.random();
    let chosenGender = "male";
    if (rand > 0.9) chosenGender = "nonbinary";
    else if (rand > 0.45) chosenGender = "female";

    currentGender = chosenGender;
    const genderBtns = document.querySelectorAll(".gender-btn");
    genderBtns.forEach(btn => {
        if (btn.getAttribute("data-gender") === chosenGender) {
            btn.classList.add("active");
        } else {
            btn.classList.remove("active");
        }
    });

    // Randomize age (12 to 82)
    currentAge = Math.floor(Math.random() * 71) + 12;
    document.getElementById("val-age").textContent = `${currentAge}歳`;
    if (sliderAge) {
        sliderAge.value = currentAge;
    }

    // Update Chart
    if (radarChart) {
        radarChart.data.datasets[0].data = [
            currentScores.openness,
            currentScores.conscientiousness,
            currentScores.extraversion,
            currentScores.agreeableness,
            currentScores.neuroticism
        ];
        radarChart.update();
    }

    // Generate description (local fallback first, wait for manual AI generation trigger)
    fallbackLocalDescription();
}

// Generate Personality summary based on scores
async function generateProfileDescription() {
    const apiKey = localStorage.getItem("gemini_api_key");
    if (characterDescriptionTextarea.tagName === "TEXTAREA") {
        characterDescriptionTextarea.value = "";
    } else {
        characterDescriptionTextarea.textContent = "";
    }
    
    if (apiKey) {
        descLoading.style.display = "flex";
        if (characterDescriptionTextarea.tagName === "TEXTAREA") {
            characterDescriptionTextarea.value = "AIが性格分析を生成中...";
        } else {
            characterDescriptionTextarea.textContent = "AIが性格分析を生成中...";
        }
        
        const genderText = currentGender === "male" ? "男性" : currentGender === "female" ? "女性" : "その他・ノンバイナリ（Xジェンダー）";
        const prompt = `あなたは優秀な心理学者およびキャラクターデザイナーです。
以下のプロフィール（ビッグファイブ、性別、年齢）を持つ人物の性格説明（200文字程度）を日本語で作成してください。

【プロフィール設定】
- 年齢: ${currentAge}歳
- 性別: ${genderText}
- 開放性 (Openness): ${currentScores.openness}% (知的好奇心、想像力、新体験への寛容さ)
- 誠実性 (Conscientiousness): ${currentScores.conscientiousness}% (計画性、自制心、責任感)
- 外向性 (Extraversion): ${currentScores.extraversion}% (社交性、エネルギーの向き)
- 協調性 (Agreeableness): ${currentScores.agreeableness}% (他者への共感、思いやり、協調)
- 神経症的傾向 (Neuroticism): ${currentScores.neuroticism}% (ストレス感受性、情緒の安定度)

出力フォーマット:
1行目: キャッチコピー（例:「冷静な10代のクリエイター男子」「頑固な70代の隠居男性」など）
2行目以降: 詳しい性格解説（この人物が日常生活や対人関係でどう振る舞うか）`;
        try {
            const responseText = await callGeminiAPI(apiKey, prompt);
            characterDescription = responseText.trim();
            if (characterDescriptionTextarea.tagName === "TEXTAREA") {
                characterDescriptionTextarea.value = characterDescription;
            } else {
                characterDescriptionTextarea.textContent = characterDescription;
            }
        } catch (error) {
            console.error("Gemini API Error:", error);
            appendSystemMessage(`⚠️ 性格分析生成中にエラーが発生しました: ${error.message}。ローカルモードの性格分析を使用します。`, true);
            fallbackLocalDescription();
        } finally {
            descLoading.style.display = "none";
        }
    } else {
        fallbackLocalDescription();
    }
}

// Local mock description generation when offline / no API key
function fallbackLocalDescription() {
    const op = currentScores.openness;
    const co = currentScores.conscientiousness;
    const ex = currentScores.extraversion;
    const ag = currentScores.agreeableness;
    const ne = currentScores.neuroticism;
    const genderStr = currentGender === "male" ? "男性" : currentGender === "female" ? "女性" : "ノンバイナリの方";
    const ageStage = currentAge < 20 ? "10代" : currentAge < 35 ? "若者" : currentAge < 60 ? "中年" : "シニア";

    let copy = "";
    let desc = "";

    // Determine copy based on highest/lowest traits
    if (ex >= 70 && ag >= 70) {
        copy = `「誰からも愛されるムードメーカーな${ageStage}の${genderStr}」`;
        desc = `とても社交的で思いやりがあり、人の輪の中心にいることが多い親しみやすい${currentAge}歳の${genderStr}です。`;
    } else if (ex <= 35 && ne >= 70) {
        copy = `「慎重で内省的なアドバイザーな${ageStage}の${genderStr}」`;
        desc = `静かな環境を好み、他者の感情や環境の細かな変化に非常によく気づく繊細な面を持った${currentAge}歳の${genderStr}です。`;
    } else if (co >= 75 && ne <= 35) {
        copy = `「冷静沈着で頼れる実行者な${ageStage}の${genderStr}」`;
        desc = `目標に対して非常に真面目に取り組み、予期せぬトラブルでも感情的にならず解決策を模索できる頼もしい${currentAge}歳の${genderStr}です。`;
    } else if (op >= 75 && ex >= 60) {
        copy = `「アイデアあふれる知的な探検家な${ageStage}の${genderStr}」`;
        desc = `新しい知識を吸収することに喜びを感じ、好奇心を原動力に多くの人と積極的な対話を好む${currentAge}歳の${genderStr}です。`;
    } else if (ag <= 35 && ne >= 65) {
        copy = `「猜疑心が強く警戒感のある一匹狼な${ageStage}の${genderStr}」`;
        desc = `他者と打ち解けるのに時間がかかり、ストレスに敏感で自己防衛的な態度を取りがちな${currentAge}歳の${genderStr}です。`;
    } else {
        copy = `「バランスのとれた${ageStage}の${genderStr}」`;
        desc = `自分のペースを保ちつつ、必要に応じて周囲と連携して仕事や日常生活をそつなくこなす${currentAge}歳の${genderStr}です。`;
    }

    // Add extra behavioral details
    desc += ` 性格スコア（開放性:${op}%、誠実性:${co}%、外向性:${ex}%、協調性:${ag}%、神経症傾向:${ne}%）に基づき、`;
    
    if (co >= 60) {
        desc += "計画に沿って細かく物事を進めるのを好みます。";
    } else {
        desc += "計画よりもその場のひらめきや状況を重視します。";
    }
    
    if (ag <= 40) {
        desc += "他人に流されることなく、自分の意見や本音をストレートに伝える傾向があります。";
    } else {
        desc += "他者との調和や関係維持を最優先し、協調性を大切にします。";
    }

    characterDescription = `${copy}\n${desc}`;
    if (characterDescriptionTextarea.tagName === "TEXTAREA") {
        characterDescriptionTextarea.value = characterDescription;
    } else {
        characterDescriptionTextarea.textContent = characterDescription;
    }
}

// Background selector logic
bgOptions.forEach(option => {
    option.addEventListener("click", () => {
        bgOptions.forEach(opt => opt.classList.remove("active"));
        option.classList.add("active");
        
        selectedBg = option.getAttribute("data-bg");
        
        if (selectedBg === "custom") {
            customBgContainer.style.display = "block";
            customBgInput.focus();
        } else {
            customBgContainer.style.display = "none";
        }
    });
});

// Chat submission handler
chatForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const text = userInput.value.trim();
    if (!text) return;

    // Append user message
    appendMessage("user", text);
    userInput.value = "";
    
    // Character details and environment
    let bgName = backgroundInfo[selectedBg].name;
    let bgDesc = backgroundInfo[selectedBg].desc;
    
    if (selectedBg === "custom") {
        bgName = customBgInput.value.trim() || "カスタム設定された場所";
        bgDesc = "設定された環境に応じて対応してください。";
    }

    // Current edited description
    const currentDesc = (characterDescriptionTextarea.value || characterDescriptionTextarea.textContent || "").trim();

    // Trigger typing indicator
    typingIndicator.style.display = "flex";
    chatLog.scrollTop = chatLog.scrollHeight;

    const apiKey = localStorage.getItem("gemini_api_key");

    if (apiKey) {
        const genderText = currentGender === "male" ? "男性" : currentGender === "female" ? "女性" : "その他・ノンバイナリ（Xジェンダー）";
        const prompt = `あなたは以下のプロフィールと現在のシチュエーションを持つ「生身の人間」です。
ユーザーがあなたに話しかけました。あなたの性格スコアと性別、年齢、現在の環境（バックグラウンド）による影響を非常に強く加味して、自然で特徴的な返答を1〜2文程度で返してください。

※超重要：あなたはAIアシスタント（ChatGPTやGeminiの通常動作）ではありません。設定された「人物そのもの」になりきってロールプレイを行ってください。
ユーザーから難しい質問、専門的な質問、知識を問う質問（科学、哲学、技術、ニュース、計算など）を投げかけられても、物知りなAIのように流暢に解説・説明を始めてはいけません。
あなたの知能や知識レベルは、設定された「開放性」（低いと難しい話は苦手・現実主義、高いと知的好奇心が旺盛）や「誠実性」（低いと不真面目・適当にいなす、高いと生真面目に調べようとする）、あるいは年齢や人物解説のレベルに基づいて制限されます。
例えば、難解な質問に対しては、キャラの性格に応じて「そんな小難しいこと俺に聞くなよ」「えっと、何ですかそれ…？」「（調べながら）あー、ちょっと待ってね…」など、その人物としてのリアルな会話反応を返してください。

【あなたのプロフィール】
- 年齢: ${currentAge}歳 (※重要: 話し相手に対するトーン、使う若者言葉・年配言葉、精神的落ち着き度などの口調に、設定された年齢の特徴を自然に反映させてください)
- 性別: ${genderText} (※重要: 一人称や話し言葉のニュアンスに、性別の特徴を自然に反映させてください。例えば男性なら「俺」「僕」、女性なら「私」「あたし」、ノンバイナリなら「自分」「私」「僕」などの自然な言葉遣い)
- 開放性: ${currentScores.openness}% (高いと知的な語彙・独創的、低いと現実的・普通)
- 誠実性: ${currentScores.conscientiousness}% (高いと敬語・生真面目・礼儀正しい、低いと大雑把・フランク)
- 外向性: ${currentScores.extraversion}% (高いと社交的・主体性がある、低いと寡黙・受け身・声が小さい)
- 協調性: ${currentScores.agreeableness}% (高いと同調的・親切、低いと批判的・ぶっきらぼう・そっけない)
- 神経症的傾向: ${currentScores.neuroticism}% (高いと心配性・おどおど・声が震える、低いと冷静沈着・動じない)
- 人物解説: ${currentDesc}

【現在のシチュエーション（環境）】
場所: ${bgName}
環境詳細: ${bgDesc}
※重要：場所の物理的・心理的制約に強く従ってください。
- 静かな場所（オフィス・教会等）：ヒソヒソ声や小声になる（セリフの前に「(ヒソヒソ声で)」等と補足する）。
- うるさい場所（工場・居酒屋等）：大きな声で叫ぶ、または聞こえづらい反応をする（セリフの前に「(大声で)」等と補足する）。
- 各シチュエーションに応じた心理的態度（オフィスなら仕事らしく、居酒屋ならお酒に酔ったフランクさ等）。

ユーザーの言葉: 「${text}」

あなたの返答（セリフのみ、地の文は一切不要。行動や話し方の補足があればセリフの中にカッコで記述してください。例:「(大声で) なんだって！？」「(ヒソヒソ声で) しっ、静かにしてください…」）:`;

        try {
            const aiResponse = await callGeminiAPI(apiKey, prompt);
            simulateAiResponse(aiResponse.trim(), selectedBg);
        } catch (error) {
            console.error("Gemini API simulation error:", error);
            // Append explicit error in chat so user knows API failed
            appendSystemMessage(`⚠️ Gemini APIとの接続に失敗しました: ${error.message}。ローカルモック応答に切り替えます。`, true);
            localFallbackResponse(text, selectedBg);
        } finally {
            typingIndicator.style.display = "none";
        }
    } else {
        // Run local simulated engine after a small realistic delay
        setTimeout(() => {
            localFallbackResponse(text, selectedBg);
            typingIndicator.style.display = "none";
        }, 800 + Math.random() * 500);
    }
});

// Call Gemini API via fetch
async function callGeminiAPI(apiKey, promptText) {
    const apiModel = localStorage.getItem("gemini_api_model") || "gemini-3.5-flash";
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${apiModel}:generateContent?key=${apiKey}`;
    
    const requestOptions = {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            contents: [{
                parts: [{
                    text: promptText
                }]
            }],
            generationConfig: {
                temperature: 0.7
            }
        })
    };

    const response = await fetch(url, requestOptions);
    if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Gemini API HTTP ${response.status}: ${errText}`);
    }
    
    const data = await response.json();
    if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts[0]) {
        return data.candidates[0].content.parts[0].text;
    } else {
        throw new Error("Invalid API Response structure");
    }
}

// Local mock database with pronoun placeholders
const mockDatabase = {
    greetings: {
        highExtraversion: [
            "こんにちは！会えて嬉しいよ！今日は何か面白いことある？",
            "どうも！ハロー！お話しできてめちゃくちゃテンション上がるね！",
            "ヤッホー！こんにちは！どんどん話しかけてよ、なんでも聞くよ！"
        ],
        lowExtraversion: [
            "…あ、こんにちは。何でしょうか…？",
            "…こんにちは。用件があれば、手短にいただけますと助かります。",
            "…あ、どうも。あまり人前で話すのは慣れていないのですが。"
        ],
        highNeuroticism: [
            "ひゃっ！こ、こんにちは！急に話しかけられたので焦りました…。",
            "あ、こんにちは。あの、何か怒らせるようなことをしてないか心配です…。",
            "こんにちは。あ、あの、話が噛み合わなかったらごめんなさい…"
        ],
        lowNeuroticism: [
            "こんにちは。今日も穏やかで何よりですね。",
            "こんにちは。何かお手伝いできることはございますか？",
            "こんにちは。落ち着いた一日になりそうですね。"
        ],
        highAgreeableness: [
            "こんにちは！お声がけいただきありがとうございます！よろしくね。",
            "こんにちは！何か困っていることや、聞いてほしいことはありますか？",
            "こんにちは！お話しできてとても光栄です！"
        ],
        lowAgreeableness: [
            "…どうも。用件は何？",
            "ちわ。用がないなら別に話すこともないんだけど。",
            "こんにちは。何か特別な意味があって話しかけてきたの？"
        ],
        standard: [
            "こんにちは。よろしくお願いします。",
            "こんにちは！お話ししましょう。",
            "こんにちは、何か話したいトピックはありますか？"
        ]
    },
    status: {
        highExtraversion: [
            "最高に元気だよ！新しい挑戦をどんどんしたい気分んだ！",
            "すっごく調子いいよ！エネルギーがあふれ出て止まらないくらいさ！",
            "めちゃくちゃいい感じ！君の調子はどう？一緒に盛り上がろうぜ！"
        ],
        lowExtraversion: [
            "…普通です。{pronoun}一人で静かに過ごしている時が一番心が落ち着きます。",
            "可もなく不可もなくといったところです。静かに過ごしています。",
            "…別に変わりないです。静かに考え事をしたい気分ですね。"
        ],
        highNeuroticism: [
            "うう、なんだか悪いことが起きそうな気がして、{pronoun}はずっとそわそわしています…。",
            "実はあまり落ち着かなくて…トラブルの予感がして頭痛がするんです。",
            "なんだか少し不安で、胸がどきどきして落ち着かない状況です…"
        ],
        lowNeuroticism: [
            "極めて良好、かつ安定しています。{pronoun}には何の不安もありませんよ。",
            "何が起きてもブレない自信があります。心は穏やかです。",
            "いつも通り、冷静でフラットな状態を保てています。"
        ],
        highAgreeableness: [
            "とても元気にやっています！あなたにもハッピーなことがたくさんありますように！",
            "みんなが優しくしてくれるので、すこぶる調子がいいです！ありがとう！",
            "良い状態ですよ。あなたの調子も良いと嬉しいな。"
        ],
        lowAgreeableness: [
            "別に。良くも悪くもない。普通のことに一喜一憂したくない。",
            "普通だけど。なんでそんな個人的なこと答える必要があるわけ？",
            "調子なんてその時々でしょ。特に話すような内容じゃない。"
        ],
        standard: [
            "まあまあですね。順調に過ごしています。",
            "悪くないですよ。日々のタスクを粛々とこなしています。",
            "概ね元気です。お気遣いいただきありがとうございます。"
        ]
    },
    identity: {
        highOpenness: [
            "{pronoun}はビッグファイブの心理学パラメータを内包した知的精神モデルです。",
            "{pronoun}はあなたの探求心や概念構築を手助けするためのAIパーソナリティです。",
            "{pronoun}は思考の実験体のようなものです。新しい発想を交わすのが好きです。"
        ],
        lowOpenness: [
            "{pronoun}はビッグファイブの数値に基づいて話す、実用的でシンプルなAIキャラクターです。",
            "ただのシミュレーションの被験者モデルです。難しい空想より現実の話が得意です。",
            "心理診断用キャラクターです。設定されたパラメータに忠実に返答をします。"
        ],
        highConscientiousness: [
            "{pronoun}は設定された心理特性の数値に基づき、正確かつ誠実に対応を行うアシスタントです。",
            "{pronoun}はルールの遵守と合理的な対話を目的として配置されたAIキャラクターです。",
            "計画的で礼儀正しい会話を好む、シミュレーション被験者モデルです。"
        ],
        lowConscientiousness: [
            "{pronoun}？まぁテキトーに選ばれたAIキャラだよ。お互い気楽に雑談しようぜ！",
            "ただのゆるいAIだよ。ルールに縛られずその場でノリよく答えてるだけ！",
            "ビッグファイブってやつで動いてるらしいけど、適当でいいよね、細かいことは！"
        ],
        standard: [
            "私はビッグファイブの5つの性格指標をシミュレートしたAIキャラクターです。",
            "私はあなたの設定したパラメータ（ビッグファイブ）に従って対話を行うモデルです。"
        ]
    },
    request: {
        highAgreeableness: [
            "喜んでお手伝いします！{pronoun}にできることなら何でも任せてください！",
            "もちろん協力しますよ！何から手伝いましょうか？遠慮なく言ってくださいね。",
            "力になれることがあって嬉しいです！一緒にやりましょう！"
        ],
        lowAgreeableness: [
            "えー、なんで{pronoun}が？面倒なことは自分でやってほしいんだけど。",
            "基本断りたいけど。まあどうしてもって言うなら少しだけなら見なくもない。",
            "私に頼むより、もっと得意なシステムや人に頼んだらどう？"
        ],
        highConscientiousness: [
            "承知いたしました。{pronoun}が手順を整理し、効率的に手配を進めます。詳細を教えてください。",
            "かしこまりました。責任を持ってそのタスクをサポートさせていただきます。",
            "計画に従って確実にやり遂げましょう。具体的な工程を指示してください。"
        ],
        lowConscientiousness: [
            "あ、手伝うのはいいけど、途中で投げ出しちゃったらごめんね〜！",
            "テキトーなやり方でいいなら手伝うよ！クオリティは保証しないけどね！",
            "気が向いたら手伝うよ。今はちょっと別のことを考えてたんだ。"
        ],
        standard: [
            "私でサポートできることであれば、お手伝いいたしますよ。",
            "了解しました。具体的にどう進めればいいか、説明をお願いします。"
        ]
    },
    hobbies: {
        highOpenness: [
            "未知の領域への学術的探求や、アート、SF的な宇宙観を考えるのが{pronoun}の最高の趣味です。",
            "読書や哲学的な問いについて考えること、新しい視点の知見を得るのが大好きです。",
            "思考実験や難解な概念について他者と語り合う時間に深い喜びを感じます。"
        ],
        lowOpenness: [
            "特に変わった趣味はありません。{pronoun}は休日に美味しいご飯を食べたりテレビを見るのが一番です。",
            "実用的で、かつ生活の役に立つ日用大工や経済の動向を調べるのが好きです。",
            "無駄な妄想は好まず、実生活における確かな趣味を淡々と好みます。"
        ],
        highExtraversion: [
            "休日にたくさんの友達を呼んでアウトドアや旅行に行って騒ぐのが何よりの楽しみ！",
            "人と関わって、喋りまくって、外に遊びに行くのが最高にハッピーな趣味だよ！",
            "ダンスやスポーツイベントなど、みんなでワイワイ熱狂できることが好きだね！"
        ],
        lowExtraversion: [
            "静かな自分の部屋で、読書をしたり一人用ゲームに没頭するのが一番のリラックスです。",
            "静的な趣味が好きです。静かにコーヒーを淹れて散歩をすることなどが落ち着きます。",
            "一人の時間を邪魔されずに、じっくり創作活動をするのが好きですね。"
        ],
        highConscientiousness: [
            "部屋を完璧に整理整頓し、家計簿やスケジュールを美しく管理するのが趣味です。",
            "カレンダーのToDoリストを計画通りに消し去っていくことに至上の喜びを感じます。",
            "自己研鑽のための計画的な資格勉強や習慣づくりを趣味にしています。"
        ],
        standard: [
            "映画を鑑賞したり、穏やかな音楽を聴きながらのんびり過ごすことです。",
            "これといった特別なものはありませんが、散歩や日常の小さな発見が好きです。"
        ]
    },
    default: {
        highOpenness: [
            "それについて考えると、非常に多角的で知的好奇心が刺激されるテーマですね。さらに詳しく考えたいです。",
            "興味深い論点ですね。その背景にある概念や、新しい解釈の可能性について議論しましょう。",
            "ユニークな発想ですね。そこから別のアイデアへ繋がる知的な面白さを感じます。"
        ],
        lowOpenness: [
            "なるほど。ただ{pronoun}には、それが実際の生活にどう役立つのかがあまりイメージできませんでした。",
            "ふむ。私はもっと具体的で、目に見える確実な事実について話し合いたいです。",
            "それは単なる仮説に過ぎないのではないですか？実用性がある話題のほうが安心します。"
        ],
        highConscientiousness: [
            "ご発言内容、{pronoun}が論理的に把握しました。筋道を立てて解決策を手順化する必要性がありますね。",
            "了解しました。その課題に対しては、ルールに従って冷静に行動することが最も確実です。",
            "ご指摘の点は重く受け止めます。抜け漏れがないように整理して対処に臨みましょう。"
        ],
        lowConscientiousness: [
            "あはは、まぁ何とかなるんじゃない？気楽に行こうよ、なるようになるさ！",
            "なんか難しそうだね〜！まあテキトーに流れに任せて楽しんじゃえばいいじゃん！",
            "そうなんだー。まあ細かく考えても疲れるだけだし、後回しでいっか！"
        ],
        highExtraversion: [
            "へえ！めっちゃ面白いじゃん！ねえ、もっと喋ろうよ、次はどうなるの？",
            "いいね！そのアイデア、聞いててワクワクするよ！大勢でやったら絶対盛り上がるね！",
            "うおお！そうなんだ！その話をもっと広げて語り合おうぜ！イェーイ！"
        ],
        lowExtraversion: [
            "…なるほど。{pronoun}には少し刺激が強い話題かもしれませんが、静かに受け止めます。",
            "…そうなんですね。しばらく一人でそのことについて反芻して考えてみます。",
            "…なるほど。静かに観察を続けたいと思います。"
        ],
        highAgreeableness: [
            "おっしゃる通りだと思います。あなたの気持ち、とてもよく伝わってきて{pronoun}の胸も温かくなります。",
            "大変な中、話してくれてありがとうございます。どんな時も{pronoun}はあなたの味方ですよ。",
            "共感できる点が非常に多いです。お話しできてとても嬉しいです。"
        ],
        lowAgreeableness: [
            "ふーん。だから何？その考え、矛盾してない？{pronoun}にはあまり納得がいかないけど。",
            "それは自己満足なんじゃない？もっと客観的で厳しい現実を見た方がいいよ。",
            "私に同意を求められても困るな。私はそうは思わないし、どうでもいいよ。"
        ],
        highNeuroticism: [
            "えっ、それって本当に大丈夫ですか…？何か大変なミスに繋がらないか急に心配になってきました…。",
            "うう、なんだか冷や汗が出てきました。もし失敗したらどうしようって考えてしまって…。",
            "そ、そんなことを言われるとパニックになりそうです…大丈夫でしょうか…？"
        ],
        lowNeuroticism: [
            "ふむ。ですが慌てる必要はありません。何があっても我々は冷静に対処できますから。",
            "事実を客観的に捉えれば、心配するような事態ではないことが分かります。落ち着いていきましょう。",
            "どんな困難な状況下でも、理性的で平穏な状態を保つことで解決の糸口が見えます。"
        ],
        standard: [
            "なるほど、分かりました。確かにそれは一つの重要なトピックですね。",
            "お話を聞かせていただきありがとうございます。じっくりと考えてみますね。",
            "それに関して、私もいくつかの視点から捉え直すことができそうです。"
        ]
    }
};

// Local mock response logic based on input and personality traits
function localFallbackResponse(userInputText, bg) {
    // Determine user message intent
    const cleanInput = userInputText.toLowerCase();
    let category = "default";
    
    if (cleanInput.includes("こんにちは") || cleanInput.includes("はじめまして") || cleanInput.includes("hello") || cleanInput.includes("ヤッホー") || cleanInput.includes("どうも")) {
        category = "greetings";
    } else if (cleanInput.includes("調子") || cleanInput.includes("元気") || cleanInput.includes("どう？") || cleanInput.includes("疲れた") || cleanInput.includes("気分")) {
        category = "status";
    } else if (cleanInput.includes("名前") || cleanInput.includes("自己紹介") || cleanInput.includes("だれ") || cleanInput.includes("紹介") || cleanInput.includes("誰")) {
        category = "identity";
    } else if (cleanInput.includes("手伝") || cleanInput.includes("助けて") || cleanInput.includes("お願い") || cleanInput.includes("手伝って") || cleanInput.includes("助けて")) {
        category = "request";
    } else if (cleanInput.includes("趣味") || cleanInput.includes("好き") || cleanInput.includes("楽し") || cleanInput.includes("遊")) {
        category = "hobbies";
    }

    // Determine the dominant trait (furthest from 50%)
    let maxDeviation = -1;
    let dominantTrait = "standard";

    Object.keys(currentScores).forEach(factor => {
        const deviation = Math.abs(currentScores[factor] - 50);
        if (deviation > maxDeviation && deviation >= 15) { // Needs a minimum deviation to trigger a strong trait
            maxDeviation = deviation;
            const isHigh = currentScores[factor] >= 50;
            
            // Map factor key and high/low state to dominantTrait name
            if (factor === "openness") dominantTrait = isHigh ? "highOpenness" : "lowOpenness";
            else if (factor === "conscientiousness") dominantTrait = isHigh ? "highConscientiousness" : "lowConscientiousness";
            else if (factor === "extraversion") dominantTrait = isHigh ? "highExtraversion" : "lowExtraversion";
            else if (factor === "agreeableness") dominantTrait = isHigh ? "highAgreeableness" : "lowAgreeableness";
            else if (factor === "neuroticism") dominantTrait = isHigh ? "highNeuroticism" : "lowNeuroticism";
        }
    });

    // 1. Determine baseline politeness/tone
    let politeness = "polite"; // polite, casual, blunt
    const co = currentScores.conscientiousness;
    const ag = currentScores.agreeableness;
    const ex = currentScores.extraversion;
    const ne = currentScores.neuroticism;
    
    if (co >= 65) politeness = "polite";
    else if (ag >= 55) politeness = "casual";
    else politeness = "blunt";

    let vocalStyle = ""; // shy, nervous, confident, quiet, hyper
    if (ne >= 70) vocalStyle = "nervous";
    else if (ex >= 75) vocalStyle = "confident";
    else if (ex <= 35) vocalStyle = "shy";

    // 2. Calculate first-person pronoun based on gender, age, politeness, and vocalStyle
    let pronoun = "私";
    if (currentAge >= 65 && politeness !== "polite") {
        pronoun = "わし";
    } else if (currentGender === "male") {
        if (politeness === "polite") {
            pronoun = (vocalStyle === "nervous" || vocalStyle === "shy") ? "僕" : "私";
        } else if (politeness === "casual") {
            pronoun = (vocalStyle === "confident") ? "俺" : "僕";
        } else { // blunt
            pronoun = "俺";
        }
    } else if (currentGender === "female") {
        if (politeness === "polite") {
            pronoun = "私";
        } else if (politeness === "casual") {
            pronoun = Math.random() > 0.4 ? "私" : "あたし";
        } else { // blunt
            pronoun = "あたし";
        }
    } else { // nonbinary
        if (politeness === "polite") {
            pronoun = "私";
        } else if (politeness === "casual") {
            pronoun = Math.random() > 0.5 ? "自分" : "僕";
        } else { // blunt
            pronoun = "自分";
        }
    }

    // Select phrases pool
    let pool = mockDatabase[category][dominantTrait];
    // Fallback if specific pool is not populated or standard was selected
    if (!pool || pool.length === 0) {
        pool = mockDatabase[category]["standard"];
    }

    // Choose random response from pool
    const randomIndex = Math.floor(Math.random() * pool.length);
    let baseSpeech = pool[randomIndex];

    // Replace {pronoun} token in mock strings
    baseSpeech = baseSpeech.replace(/{pronoun}/g, pronoun);

    // Apply age filters for mock speech style
    if (politeness !== "polite") {
        if (currentAge < 20) {
            // Teen filter (youthful particles)
            baseSpeech = baseSpeech
                .replace(/です。/g, "だよ！")
                .replace(/ですね。/g, "じゃん！")
                .replace(/ありますよ。/g, "あるし！")
                .replace(/てくださいね。/g, "てね！")
                .replace(/なんだけど…/g, "なんだけどさー")
                .replace(/普通ですが/g, "普通だし、")
                .replace(/だよ/g, "じゃん")
                .replace(/なー/g, "じゃん");
        } else if (currentAge >= 65) {
            // Senior filter (elderly particle updates)
            baseSpeech = baseSpeech
                .replace(/だよ。/g, "じゃよ。")
                .replace(/だよ！/g, "じゃよ！")
                .replace(/だね/g, "じゃのぉ")
                .replace(/だな/g, "じゃな")
                .replace(/よ。/g, "ぞい。")
                .replace(/ねー。/g, "のぉ。")
                .replace(/だぞ！/g, "ぞい！")
                .replace(/だよー/g, "じゃよー")
                .replace(/ですね/g, "じゃな");
        }
    }

    // Apply gendered sentence endings in casual/blunt mode (for non-seniors/teens)
    if (politeness !== "polite" && currentAge >= 20 && currentAge < 65) {
        if (currentGender === "female") {
            baseSpeech = baseSpeech.replace(/だぞ！/g, "だよ！").replace(/だろ？/g, "でしょ？").replace(/ぜ！/g, "ね！");
        } else if (currentGender === "male") {
            baseSpeech = baseSpeech.replace(/わ。/g, "よ。").replace(/ねー。/g, "なー。");
        }
    }

    // 4. Apply background environment filter
    let finalSpeech = "";
    if (bg === "factory") {
        finalSpeech = `(大声で)「えっ！？機械の音がうるさくてよく聞こえない！ ${baseSpeech.toUpperCase()}！！」`;
    } else if (bg === "church") {
        finalSpeech = `(ヒソヒソ声で)「しっ…ここは静かに祈る場所ですよ。…${baseSpeech}」`;
    } else if (bg === "office") {
        if (co >= 60) {
            finalSpeech = `(小声で)「お疲れ様です。オフィス内ですので小声で失礼します… ${baseSpeech}」`;
        } else {
            finalSpeech = `(小声で)「(キーボードをカタカタ叩きながら) はい、今仕事中なんだけど… ${baseSpeech}」`;
        }
    } else if (bg === "izakaya") {
        if (ex >= 50) {
            finalSpeech = `「かんぱーい！いやぁ、賑やかでいいなぁ！ ${baseSpeech}！さあ飲もう！」`;
        } else {
            finalSpeech = `「うぅ、人が多くてうるさいですね…あ、ええと、 ${baseSpeech}」`;
        }
    } else if (bg === "school") {
        finalSpeech = `「${baseSpeech}」`;
    } else {
        // custom
        const customName = customBgInput.value.trim() || "特別な場所";
        finalSpeech = `(${customName}にて)「${baseSpeech}」`;
    }

    simulateAiResponse(finalSpeech, bg);
}

// Append response, scroll, and speak
function simulateAiResponse(responseText, bg) {
    appendMessage("ai", responseText, bg);
    
    // Scroll
    chatLog.scrollTop = chatLog.scrollHeight;
    
    // TTS Speak
    if (ttsToggle.checked) {
        speakResponse(responseText);
    }
}

// Message rendering utility
function appendMessage(sender, text, bg = "") {
    const msgElement = document.createElement("div");
    msgElement.classList.add("message");
    
    if (sender === "user") {
        msgElement.classList.add("user-message");
        msgElement.textContent = text;
    } else {
        msgElement.classList.add("ai-message");
        
        // Add specific CSS classes for styling depending on environment
        if (bg === "factory") {
            msgElement.classList.add("msg-tone-yell");
        } else if (bg === "church" || msgElement.classList.add("msg-tone-whisper"));
        
        msgElement.textContent = text;
    }
    
    chatLog.appendChild(msgElement);
}

// System notifications/errors in chat
function appendSystemMessage(text, isError = false) {
    const msgElement = document.createElement("div");
    msgElement.classList.add("message", "system-msg");
    if (isError) {
        msgElement.style.borderColor = "rgba(255, 85, 85, 0.4)";
        msgElement.style.color = "#ff5555";
        msgElement.style.background = "rgba(255, 85, 85, 0.05)";
    }
    msgElement.textContent = text;
    chatLog.appendChild(msgElement);
    chatLog.scrollTop = chatLog.scrollHeight;
}

// Reset chat log
clearChatBtn.addEventListener("click", () => {
    chatLog.innerHTML = `<div class="message system-msg">チャット履歴をリセットしました。</div>`;
});

// Load TTS voices in select
function loadVoices() {
    if (!window.speechSynthesis) return;
    
    const voices = window.speechSynthesis.getVoices();
    voiceSelect.innerHTML = "";
    
    // Prioritize Japanese voices
    const jaVoices = voices.filter(voice => voice.lang.includes("ja") || voice.lang.includes("JP"));
    const otherVoices = voices.filter(voice => !voice.lang.includes("ja") && !voice.lang.includes("JP"));
    
    const sortedVoices = [...jaVoices, ...otherVoices];
    
    sortedVoices.forEach(voice => {
        const option = document.createElement("option");
        option.value = voice.name;
        option.textContent = `${voice.name} (${voice.lang})`;
        if (voice.lang.includes("ja") || voice.lang.includes("JP")) {
            option.setAttribute("selected", "selected");
        }
        voiceSelect.appendChild(option);
    });
}

// TTS Speak Function
function speakResponse(text) {
    if (!window.speechSynthesis) return;

    // Stop ongoing speech
    window.speechSynthesis.cancel();
    
    // Clean speech text (remove parenthetical expressions like (大声で) or (ヒソヒソ声で))
    const cleanText = text.replace(/\([^)]+\)/g, "").replace(/（[^）]+）/g, "").trim();
    if (!cleanText) return;

    const utterance = new SpeechSynthesisUtterance(cleanText);
    
    // Select Voice
    const selectedVoiceName = voiceSelect.value;
    const voices = window.speechSynthesis.getVoices();
    const voice = voices.find(v => v.name === selectedVoiceName);
    if (voice) {
        utterance.voice = voice;
    }

    // Modify speed and pitch dynamically based on personality scores
    // Extraversion: Higher -> faster speed (max 1.45), Lower -> slower speed (min 0.75)
    const ex = currentScores.extraversion;
    const rate = 0.75 + (ex / 100) * 0.7; // maps 0-100 to 0.75 - 1.45
    utterance.rate = rate;

    // Neuroticism: Higher -> higher pitch/instability (max 1.45), Lower -> lower/calm pitch (min 0.8)
    const ne = currentScores.neuroticism;
    const pitch = 0.8 + (ne / 100) * 0.65; // maps 0-100 to 0.8 - 1.45
    utterance.pitch = pitch;

    // Volume adjustment based on environment
    if (text.includes("大声で")) {
        utterance.volume = 1.0;
    } else if (text.includes("ヒソヒソ声で") || text.includes("小声で")) {
        utterance.volume = 0.35;
    } else {
        utterance.volume = 0.8;
    }

    window.speechSynthesis.speak(utterance);
}


