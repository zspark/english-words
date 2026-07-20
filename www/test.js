const cache = {};

const input = document.getElementById("wordInput");

const card = document.getElementById("card");

const list = document.getElementById("list");

input.addEventListener("keydown", e => {

    if (e.key === "Enter") {

        queryWord(input.value.trim());

    }

});

async function queryWord(word) {

    if (!word) return;

    if (cache[word]) {

        show(cache[word]);

        return;

    }

    const url = `https://api.dictionaryapi.dev/api/v2/entries/en/${word}`;

    try {

        const res = await fetch(url);

        const json = await res.json();

        const data = parse(json);

        cache[word] = data;

        show(data);

        refreshList();

    } catch (e) {

        alert("Not found.");

    }

}

function parse(json) {

    const entry = json[0];

    let ipa = "";

    for (const p of entry.phonetics) {

        if (p.text) {

            ipa = p.text;

            break;

        }

    }

    const meanings = [];

    entry.meanings.forEach(m => {

        m.definitions.forEach(d => {

            meanings.push(

                `${m.partOfSpeech}: ${d.definition}`

            );

        });

    });

    return {

        word: entry.word,

        ipa,

        meaning: meanings.join("<br>"),

        cn: ""

    };

}

function show(data) {

    card.style.display = "block";

    card.innerHTML = `

<div class="word">

${data.word}

</div>

<div class="ipa">

${data.ipa}

</div>

<div class="meaning">

${data.meaning}

</div>

`;

}

function refreshList() {

    list.innerHTML = "";

    Object.values(cache)

        .sort((a, b) => a.word.localeCompare(b.word))

        .forEach(x => {

            const div = document.createElement("div");

            div.className = "item";

            div.innerHTML = x.word;

            list.appendChild(div);

        });

}

document.getElementById("exportBtn").onclick = () => {

    const blob = new Blob(

        [JSON.stringify(cache, null, 4)],

        { type: "application/json" }

    );

    const a = document.createElement("a");

    a.href = URL.createObjectURL(blob);

    a.download = "dictionary.json";

    a.click();

};

document.getElementById("importBtn").onclick = () => {

    document.getElementById("fileInput").click();

};

document.getElementById("fileInput").onchange = e => {

    const file = e.target.files[0];

    if (!file) return;

    const reader = new FileReader();

    reader.onload = () => {

        Object.assign(cache, JSON.parse(reader.result));

        refreshList();

    };

    reader.readAsText(file);

};