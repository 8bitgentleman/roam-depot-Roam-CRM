(() => {
  let query = `[:find (pull ?refs [:node/title :block/uid :block/string :block/refs {:block/refs [:node/title :block/uid]}])
                      :in $ ?namespace
                      :where 
						[?e :node/title ?namespace]
						[?refs :block/refs ?e]
						]`;

  let results = window.roamAlphaAPI.q(query,'Agenda').flat();



  results.forEach(result => {
    if (result.hasOwnProperty('refs')) {
      // Do something if "refs" property exists
      // console.log("Object has refs:", result.refs);
      result.refs.forEach(element => {
      
      });
    }
    
  });
  // return result;
})();