
(() => {
    function parseStringToDate(dateString) {
      const defaultYear = 1980; // Set a default year, you can change it to whatever you prefer
    
      // Array of month names for parsing
      const monthNames = [
        'January', 'February', 'March', 'April',
        'May', 'June', 'July', 'August',
        'September', 'October', 'November', 'December'
      ];
    
      // Split the dateString into parts
      const parts = dateString.split(' ');
    
      let month, day, year;
    
      // Check the length of parts to determine the format
      if (parts.length === 2) {
        // Format: Month Day
        month = monthNames.indexOf(parts[0]);
        day = parseInt(parts[1]);
        year = defaultYear;
      } else if (parts.length === 3) {
        // Format: Month Day, Year
        month = monthNames.indexOf(parts[0]);
        day = parseInt(parts[1]);
        year = parseInt(parts[2]);
      } else {
        // Invalid format
        console.error('Invalid date format');
        return null;
      }
    
      // Create a Date object
      const dateObject = new Date(year, month, day);
      
      return dateObject;
    }
    
   
    
    let query = `[:find (pull ?r [* {:block/page ...}])
                        :in $ ?namespace
                        :where 
                          [?p :node/title ?namespace]
                          [?r :block/refs ?p]
                          [?r :block/page ?pr]
                          ]`;
  
    let result = window.roamAlphaAPI.q(query,'Birthday').flat();
    result.forEach(block => {
      const dateString = block.string.split("::", 2)[1].replace(/\[|\]/g, '');
      // console.log(dateString);
      const birthdays = parseStringToDate(dateString.trim())
      const page = block.page.title
      // console.log(birthdays);
      console.log(page);
      
      
    });
    // return result;
  })();