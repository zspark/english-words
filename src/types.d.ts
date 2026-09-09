interface ENV {
    DB: {
        prepare: (s: string) => any,
    },
    AI: any
}
type AIProvider = "DeepSeek" | "ChatGPT" | "_NONE_";
export { AIProvider };


type RequestType = keyof CSType;
type RequestBodyContentType<T> = {
    accessToken: string,
    syncTime: number,
    requestType: RequestType,
    content: T,
}

type ResponseBodyContentType<T> = {
    info: string,
    syncTime?: number,
    content: T,
}

type ResponseEvent<T> = CustomEvent<T>
type ResponseCallback<T> = (e: ResponseEvent<T>) => void;

type SyncRecordType = { id: number, time_sync: number, words: string, action: number };

type CSType = {
    getWordList: {
        C: RequestBodyContentType<{}>,
        S: ResponseBodyContentType<{ list: string[] }>,
    },
    getDetail: {
        C: RequestBodyContentType<{ word: string, aiProvider: AIProvider, apiKey: string }>,
        S: ResponseBodyContentType<{ word: string, detail: Detail, success: boolean }>,
    },
    putDetail: {
        C: RequestBodyContentType<{ detail: Detail }>,
        S: ResponseBodyContentType<{ word: string, serverDetail: Detail, clientDetail: Detail, success: boolean }>,
    },
    deleteWord: {
        C: RequestBodyContentType<{ detail: Detail }>,
        S: ResponseBodyContentType<{ word: string, serverDetail?: Detail, clientDetail: Detail, success: boolean }>,
    },
    sync: {
        C: RequestBodyContentType<{}>,
        S: ResponseBodyContentType<{}>,
    },
    syncAll: {
        C: RequestBodyContentType<{}>,
        S: ResponseBodyContentType<{}>,
    },
    getNews: {
        C: RequestBodyContentType<{ vendor: string }>,
        S: ResponseBodyContentType<{}>,
    },
}
type CSKey = keyof CSType;
type RequestBody<K extends CSKey> = CSType[K]["C"];
type ResponseBody<K extends CSKey> = CSType[K]["S"];
type RequestData<K extends CSKey> = CSType[K]["C"]['content'];
type ResponseData<K extends CSKey> = CSType[K]["S"]['content'];

type WordLevelType = "ALL" | "A1" | "A2" | "B1" | "B2" | "C1" | "C2";

type Detail = {
    word: string,
    ipa: string,
    meaning: string,
    level: WordLevelType,
    note: string,
    links: string,
    tags: string,
    readonly time_create: number,
    readonly time_modify: number,
}
type Words = Record<string, Detail>


type Result = { word: string, correct: boolean };
type Results = Record<string, { attempt: number, correct: number }>;

type Dict = {
    __VERSION__: string,
    meta: {
        tags: string[],
    },
    record: Results,
    dict: Words,
}

type ActionWord = "delete" | "add" | "modify";

type DictSyncData = {
    lists: {
        addlist: string[],
        dellist: string[],
        modlist: string[],
    },
    dict: Words,
}

type DictSyncDataSC = DictSyncData & {
    tags: string,
    lemmatize: string,
}

type HTMLString = string;

type ArticleContentType = {
    content: string[],
    description: string,
    link: string,
    pub_date: string,
    title: string,
}

type SectionID = "dictionary" | "article" | "test" | "result" | "setting";

type ChildMode = "append-first" | "append-last" | "removeall"

export { ENV, ActionWord, CSKey, RequestData, ResponseData, RequestBody, ResponseBody, CSType, SyncRecordType, RequestBodyContentType, ResponseBodyContentType, ChildMode, SectionID, ArticleContentType, HTMLString, Detail, Words, Result, Results, Dict, DictSyncData, DictSyncDataSC, RequestType, ResponseEvent, ResponseCallback, WordLevelType }

