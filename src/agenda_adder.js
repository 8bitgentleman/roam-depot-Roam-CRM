async function parseAgendaBlocks() {
  function getDictionaryWithKeyValue(list, key, value) {
    return list.find(function(dict) {
      // Ensure that dict[key] is a string and then check if it includes the value
      return typeof dict[key] === 'string' && dict[key].includes(value);
    });
  }

  function getBlockUidByContainsTextOnPage(text,page) {
    let query = `[:find
      (pull ?node [:block/uid])
      :in $ ?pageTitle ?string
      :where
      [?sourcePage :node/title ?pageTitle]
      [?node :block/page ?sourcePage]
      (or [?node :block/string ?node-String]
          [?node :node/title ?node-String])
      [(clojure.string/includes? ?node-String ?string)]
    ]`;
  
    let result = window.roamAlphaAPI.q(query, page, text).flat();
  
    if (result.length === 0) {
      // Agenda:: block doesn't exist on the person's page so we need to make it
      const newUID = window.roamAlphaAPI.util.generateUID()
      const pageUID = window.roamAlphaAPI.data.pull("[:block/uid]", `[:node/title \"${page}\"]`)[":block/uid"]
      
      // create Agenda:: block
      window.roamAlphaAPI.createBlock({"location":{"parent-uid":pageUID, "order": 'last'},"block":{"string": "Agenda::", "uid":newUID}})

      return newUID; 
    } else {
      // Return the uid of the first block that contains Agenda::
      return result[0].uid;
    }
  }
  // TODO does this need to be duped?
  const people = await getAllPeople();

  // Precompile the regex
  const agendaRegex = /\[\[Agenda\]\]|\#Agenda|\#\[\[Agenda\]\]/g;

  // Function to create a TODO block
  function createTodoBlock(sourceUID, personAgendaBlock) {
    const newBlockString = `{{[[TODO]]}} ((${sourceUID}))`;
    window.roamAlphaAPI.createBlock({
      location: { 'parent-uid': personAgendaBlock, order: 'last' },
      block: { string: newBlockString }
    });
  }

  // Function to clean up the original block
  function cleanUpBlock(block) {
    const cleanedString = block.string.replace(agendaRegex, '');
    window.roamAlphaAPI.updateBlock({
      block: { uid: block.uid, string: cleanedString }
    });
  }

  // Main function to process the blocks
  const query = `[:find (pull ?refs [:node/title
                                  :block/uid
                                  :block/string
                                  :block/refs
                                  {:block/refs [:node/title :block/uid]}])
                :in $ ?namespace
                :where 
                  [?e :node/title ?namespace]
                  [?refs :block/refs ?e]
                ]`;
  
  const agendaBlocks = window.roamAlphaAPI.q(query, 'Agenda').flat();
  const filteredAgendaBlocks = agendaBlocks.filter(block => 
    !block.string.startsWith("Agenda::") && block.refs && block.refs.length >= 2
  );

  filteredAgendaBlocks.forEach(block => {
    const relevantRefs = block.refs.filter(ref => ref.title !== "Agenda");
    relevantRefs.forEach(ref => {
      const matchingPerson = getDictionaryWithKeyValue(people, "title", ref.title);
      if (matchingPerson) {
        const personAgendaBlock = getBlockUidByContainsTextOnPage("Agenda::", matchingPerson.title);
        createTodoBlock(block.uid, personAgendaBlock);
        cleanUpBlock(block);
        console.log(block);
      }
    });
  });

}