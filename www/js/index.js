import { isEditing } from "./utils.js";
import logger from "./logger.js";
import Cacher from "./cacher.js";
import Navigator, { NAV_EVT_SECTION } from "./navigator.js";
import Dictionary from "./dictionary.js";
import cmp from "./components.js";
import Card from "./card.js";
import Words from "./section-words.js";
import Article from "./section-article.js";
import Test from "./section-test.js";
import Result from "./section-result.js";
import Setting from "./section-setting.js";
const ele_container = document.getElementById("middle");
const ele_button = document.getElementById('back-to-top');
document.addEventListener("DOMContentLoaded", (e) => {
    let _dictionary = new Dictionary();
    let _navigator = new Navigator(_dictionary).setParent(document.body, "append-first");
    let _card = new Card(_dictionary);
    let _currentSection = null;
    let _words = new Words(_dictionary, _card);
    let _article = new Article(_dictionary, _card);
    let _test = new Test(_dictionary, _card);
    let _result = new Result(_dictionary, _card);
    let _setting = new Setting(_dictionary, _card);
    document.addEventListener("keydown", (event) => {
        // logger.debug(event.key)
        if (isEditing(event))
            return;
        _card.keyEvent(event);
        _currentSection?.keyEvent(event);
    });
    const _localData = Cacher.localProxy.get("sec_setting", {});
    const _darkTheme = _localData['theme'];
    if (_darkTheme) {
        document.documentElement.setAttribute('data-theme', 'dark');
    }
    else {
        document.documentElement.removeAttribute('data-theme');
    }
    function _switchToSection(id) {
        let _nextSection;
        if (id === "sec-dictionary") {
            if (_currentSection == _words)
                return;
            _nextSection = _words;
        }
        else if (id === "sec-read") {
            if (_currentSection == _article)
                return;
            _nextSection = _article;
        }
        else if (id === "sec-test") {
            if (_currentSection == _test)
                return;
            _nextSection = _test;
        }
        else if (id === "sec-result") {
            if (_currentSection == _result)
                return;
            _nextSection = _result;
        }
        else if (id === "sec-setting") {
            if (_currentSection == _setting)
                return;
            _nextSection = _setting;
        }
        else {
            logger.error(`Should not be here. secion id is: ${id}`);
            return;
        }
        Cacher.localProxy.set("homepage.sectionID", id);
        _currentSection?.deactive();
        _currentSection = _nextSection;
        _currentSection.ui.setParent(ele_container);
        _currentSection.active();
    }
    const _v = Cacher.localProxy.get("homepage.sectionID", "sec-dictionary");
    logger.log(`current section id: ${_v}`);
    _switchToSection(_v);
    _navigator.highlightSection(_v);
    window.addEventListener('scroll', () => {
        //logger.debug(window.scrollY);
        if (ele_button) {
            ele_button.style.display = window.scrollY > 200 ? 'block' : 'none';
        }
        _currentSection?.setSync(window.scrollY);
    });
    ele_button?.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
    // _dictionary.addEventListener(_dictionary.EVT_DICT, (e) => {
    //     if (e.detail.action === "begin:sync") {
    //         const _mask = cmp.showMask(`<p>Dictionary is Sync ...</p>`);
    //     } else if (e.detail.action === "end:sync") {
    //         logger.log("syncd");
    //     }
    // });
    if (Cacher.wordsProxy.isEmpty()) {
        cmp.showMask(`
<p>This website is still under developing, more patience and tolerance would be much appriciated.</p>`, "Got It, Close", () => { });
    }
    _navigator.addEventListener(NAV_EVT_SECTION, (e) => {
        const _d = e.detail;
        _switchToSection(_d.id);
    });
    _dictionary.addEventListener(Dictionary.EVT_DICT, e => {
        const _d = e.detail;
        if (_d.action === "imported") {
            cmp.showMask(`
<p>Succefully Imported Data to Dictionary.</p>`, "Got It", () => { });
        }
        else if (_d.action === "exported") {
            cmp.showMask(`
<p>Succefully Exported Data to Local File.</p>`, "Got It", () => { });
        }
        else if (_d.action === "clear") {
            cmp.showMask(`
<p>Succefully Clear the Dictionary.</p>`, "Got It", () => { });
        }
    });
    //_dictionary.sync();
});
