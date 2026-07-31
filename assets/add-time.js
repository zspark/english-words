const start = Date.now();

Object.values(data.dict).forEach((word, index) => {
    word.time = start + index;
});
