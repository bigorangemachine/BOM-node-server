const integrationUtils = {
  shutDownApp: (App, afterCb, result) => App.stop()
    .then(() => { try{afterCb(result);} catch(e) {throw e;}; return result; })
};

export default integrationUtils;
