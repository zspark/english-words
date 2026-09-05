
type WordLevelType = "ALL" | "A1" | "A2" | "B1" | "B2" | "C1" | "C2";

type Detail = {
    word?: string, // Basically used as key in a map or object. So it's optional.

    ipa: string,
    meaning: string,
    level: WordLevelType,
    note: string,
    links: string,
    tags: string,
    time_create: number,
    time_modify: number,

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

type RequestType = "sync" | "sync-all" | "get-news";
type RequestData = {
    requestType: RequestType,
    content: {}
    syncTime?: number,
    accessToken?: string,
}
type ResponseData = {
    msg: string,
    content: {},
    syncTime: number,
} | null

type ResponseEvent = CustomEvent<ResponseData>
type ResponseCallback = (e: ResponseEvent) => void;

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

export { ChildMode, SectionID, ArticleContentType, HTMLString, Detail, Words, Result, Results, Dict, DictSyncData, DictSyncDataSC, RequestData, RequestType, ResponseEvent, ResponseCallback, ResponseData, WordLevelType }
