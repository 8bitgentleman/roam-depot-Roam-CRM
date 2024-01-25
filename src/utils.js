import createBlock from "roamjs-components/writes/createBlock"
 
function isSecondDateAfter(firstDateString, secondDateString) {
  // Parse the dates from the strings
  const firstDate = new Date(firstDateString);
  const secondDate = new Date(secondDateString);

  // Compare the dates
  return secondDate > firstDate;
}

function parseStringToDate(dateString) {
  const defaultYear = new Date().getFullYear(); // Use the current year as default

  // Array of month names for parsing
  const monthNames = [
    'January', 'February', 'March', 'April',
    'May', 'June', 'July', 'August',
    'September', 'October', 'November', 'December'
  ];

  // Remove any st, nd, rd, th suffixes from day
  dateString = dateString.replace(/(\d+)(st|nd|rd|th)/, '$1');
  
  // Split the dateString into parts
  const parts = dateString.split(' ');

  let month, day, year;

  // Check the length of parts to determine the format
  if (parts.length === 2) {
    // Format: Month Day
    month = monthNames.indexOf(parts[0]);
    day = parseInt(parts[1], 10);
    year = defaultYear;
  } else if (parts.length === 3) {
    // Try to parse the year first, as it's unambiguous
    year = parseInt(parts[2], 10);
    if (isNaN(year)) {
      // If the year isn't a number, assume it's a part of the day and use the default year
      day = parseInt(parts[1], 10);
      month = monthNames.indexOf(parts[0]);
      year = defaultYear;
    } else {
      // If the year is a number, parse the month and day
      month = monthNames.indexOf(parts[0]);
      day = parseInt(parts[1], 10);
    }
  } else {
    // Invalid format
    console.error('Invalid date format');
    return null;
  }

  // Check for invalid month or day
  if (month === -1 || isNaN(day) || isNaN(year)) {
    console.error('Invalid date components');
    return null;
  }

  // Create a Date object
  const dateObject = new Date(year, month, day);
  
  return dateObject;
}

function OLDgetAllPeople() {
  let mappedResults = {};
  let query = `[:find 
      (pull ?node [[:block/string :as :birthday-string] :block/uid])
      (pull ?PAGE [:node/title])
      (pull ?CONTACTdec [[:node/title :as :contact-title] [:block/string :as :contact-string] :block/refs {:block/refs ...}])
      (pull ?CONTACTLastdec [[:block/string :as :last-contact-string] [:block/uid :as :last-contact-uid]])
  :where
      [?Birthday-Ref :node/title "Birthday"]
      [?Tags-Ref :node/title "Tags"]
      [?person-Ref :node/title "people"]
      [?ContactFrequency-Ref :node/title "Contact Frequency"]
      [?LastContact-Ref :node/title "Last Contacted"]
      [?node :block/refs ?Birthday-Ref]
      [?node :block/page ?PAGE]
      [?PEOPLEdec :block/parents ?PAGE]
      [?PEOPLEdec :block/refs ?Tags-Ref]
      [?PEOPLEdec :block/refs ?person-Ref]
      [?CONTACTdec :block/parents ?PAGE]
      [?CONTACTLastdec :block/parents ?PAGE]
      [?CONTACTdec :block/refs ?ContactFrequency-Ref]
      [?CONTACTLastdec :block/refs ?LastContact-Ref]
      (not
          [?not_populated-Ref :node/title "not_populated"]
          [?PEOPLEdec :block/refs ?not_populated-Ref]
      )
  ]`;

  let results = window.roamAlphaAPI.q(query).flat();
  // Iterate through results 4 at a time
  for (let i = 0; i < results.length; i += 4) {
      let node = results[i];
      let page = results[i + 1];
      let contact = results[i + 2];
      let lastContact = results[i + 3];
      
      // Merge the node and page objects
      let mergedObject = {
      ...node, // Spread the properties of the node object
      ...page,  // Spread the properties of the page object
      ...contact,
      ...lastContact
      };

      // parse birthday date
      const birthdayDateString = mergedObject["birthday-string"].split("::", 2)[1].replace(/\[|\]/g, '');
      const conatctDateString = mergedObject["last-contact-string"].split("::", 2)[1].replace(/\[|\]/g, '');
      
      const filteredObjects = mergedObject.refs.filter(obj => {
          // Assuming there's only one key-value pair in each object
          return Object.values(obj).some(value => value.toLowerCase().includes("list"));
      });
        // If no object with "list" is found, set "C List"
      if (filteredObjects.length === 0) {
          mergedObject.contact = "C List";
      } else {
          mergedObject.contact = filteredObjects[0]['contact-title']
      }
      // if there is no last contact date then set it as today to kick things off
      const last_contact = parseStringToDate(conatctDateString.trim()) || new Date()

      mappedResults[mergedObject['title']] = {
          "birthday":parseStringToDate(birthdayDateString.trim()),
          "contact_list":mergedObject.contact,
          "birthday_UID":mergedObject['uid'],
          "last_contact":last_contact,
          "last_contact_uid":mergedObject["last-contact-uid"]
          }

      
  }
  return mappedResults
}

export async function getAllPeople() {

  let query = `[:find 
  (pull ?PAGE [:attrs/lookup :block/string :block/uid :node/title {:attrs/lookup [:block/string :block/uid]} ])
  :where
  [?Template-Ref :node/title "roam/templates"]
  [?Tags-Ref :node/title "Tags"]
  [?person-Ref :node/title "people"]
  [?node :block/page ?PAGE]
  [?PEOPLEdec :block/parents ?PAGE]
  [?PEOPLEdec :block/refs ?Tags-Ref]
  [?PEOPLEdec :block/refs ?person-Ref]
  (not
      [?PAGE :node/title "roam/templates"]      
  )
  (not
      [?PAGE :node/title "SmartBlock"]      
  )
  ]`;

  let results = await window.roamAlphaAPI.q(query).flat();

  function extractElementsWithKeywords(data, keywords) {
      return data.map(item => {
          // Initialize an object to hold the categorized items with empty arrays
          const categorizedItems = keywords.reduce((acc, keyword) => {
              const propName = keyword.replace(/::/g, '');
              acc[propName] = []; // Initialize each property with an empty array
              return acc;
          }, {});

          // Check if lookup exists and is an array
          if (Array.isArray(item.lookup)) {
              // Iterate over each keyword
              keywords.forEach(keyword => {
                  // Filter the lookup array for items containing the current keyword
                  const filteredLookup = item.lookup.filter(lookupItem => {
                      return lookupItem.string && lookupItem.string.includes(keyword);
                  });

                  // Assign the filtered array to the corresponding property
                  const propName = keyword.replace(/::/g, '');
                  categorizedItems[propName] = filteredLookup;
              });
          }

          // Return the original item with the categorized items added
          return {
              ...item,
              ...categorizedItems,
          };
      });
  }

  // Define the attributes to extract for
  const keywords = ["Birthday::", "Contact Frequency::", "Last Contacted::", "Email::"];


  return extractElementsWithKeywords(results, keywords);
}

function findPersonByEmail(people, email) {
  const result = people
      .filter(item => item.Email.some(emailItem => emailItem.string.includes(email)))
      .map(item => item.title);
  return result
}

export async function getEventInfo(people) {
  await window.roamjs.extension.google.fetchGoogleCalendar({
      startDatePageTitle: window.roamAlphaAPI.util.dateToPageTitle(new Date())
  }).then(results => {      
      // Iterate through each response and split the string
      if (results[0].text!=='No Events Scheduled for Selected Date(s)!') {
          
          // create parent Call block at the top of the DNP
          let newBlockUID = window.roamAlphaAPI.util.generateUID()
          console.log("create new parent block: ", newBlockUID);
          
          window.roamAlphaAPI.createBlock(
              {"location": 
                  {"parent-uid": window.roamAlphaAPI.util.dateToPageUid(new Date()), 
                  "order": 0}, 
              "block": 
                  {"string": "Calls Today",
                  "heading":3,
                  "open":true,
                  "uid": newBlockUID}})

          results.forEach(async result => {
              // I split the result string manually here
              // TODO update this when the PR goes through

              let [summary, description, location, start, end, attendees] = result.text.split("=:=");
              attendees = attendees.split(", ")
              // only process events with more than 1 confirmed attendee
              if (attendees.length > 1) {

                  let attendeeNames = []
                  attendees.forEach(email => {
                      let name = findPersonByEmail(people, email)
                      if (name.length > 0) {
                          // push the formatted person page name
                          attendeeNames.push(`[[${name[0]}]]`)
                      } else {
                          attendeeNames.push(email)
                      }
                  });
                  let headerString = `[[Call]] with ${attendeeNames.join(" and ")} about **${summary}**`

                  const blockJSON = [
                      {
                          string: headerString, 
                          children:[
                              { string: "Notes::", children:[{string: ""}] },
                              { string: "Next Actions::", children:[{string: ""}] },
                              ]
                      }
                      ]
                  createChildren(newBlockUID, blockJSON)
              }

          });  
      }
      
  }).catch(error => {
      console.error(error);
  });

}

// const blockJSON = [
//   {
//     string: "**Birthdays Today**", children:
//       [
//           { string: "[Person Name](birthday_UID)" },
//         ...
//         ]
//   }
// ]

export async function createChildren(parentBlockUid, childrenContents) {
  for (let index = 0; index < childrenContents.length; index++) {
    const element = childrenContents[index];
    const newBlockUID = roamAlphaAPI.util.generateUID();
    window.roamAlphaAPI.createBlock(
      {
        "location":
          { "parent-uid": parentBlockUid, "order": 0 },
        "block":
          { "string": element.string, "uid": newBlockUID }
      },
    )
    if (element.children) {
      createChildren(newBlockUID, element.children)
    }
  }
}

function shouldContact(person) {
  // Define the current date
  const currentDate = new Date();

  // Define the intervals in milliseconds
  const intervals = {
    "A List": 14 * 24 * 60 * 60 * 1000, // Every two weeks
    "B List": 2 * 30 * 24 * 60 * 60 * 1000, // Roughly every two months
    "C List": 6 * 30 * 24 * 60 * 60 * 1000, // Roughly every six months
    "D List": 365 * 24 * 60 * 60 * 1000, // Once a year
  };

  // Extract the relevant properties from the person object
  const { contact_list, last_contact, name } = person;

  // Convert the last_contact string to a Date object
  const lastContactDate = new Date(last_contact);
  
  // Calculate the next contact date based on the last_contact date and the interval for the contact_list
  const nextContactDate = new Date(lastContactDate.getTime() + intervals[contact_list]);

  // Determine if the current date is past the next contact date
  return currentDate >= nextContactDate;
}

function checkContacts(people) {
  
  const reminders =  [
    
  ]
  // inefficient since I already loop in checkBirthdays
  for (const person in people) {
    if (people.hasOwnProperty(person)) {
      if (shouldContact(people[person])) {
        // this is duplicated should really be moved out into the master loop on refactor
        people[person].name = person
        reminders.push(people[person])
      }
      
    }
  }
  
  return {"toBeContacted": reminders}
}

function checkBirthdays(lastBirthdayCheck, people) {
  
  
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Normalize today's date to start of day for comparison
  const birthdaysToday = [];
  const upcomingBirthdays = [];

  for (const person in people) {
      if (people.hasOwnProperty(person)) {
        
          const birthday = new Date(people[person].birthday);
          const currentYear = today.getFullYear();
          birthday.setFullYear(currentYear); // Set birthday year to current year for comparison
          birthday.setHours(0, 0, 0, 0); // Normalize birthday to start of day for comparison

          const timeDiff = birthday - today;
          const daysDiff = timeDiff / (1000 * 60 * 60 * 24);

          if (daysDiff === 0) {
              const modPerson = people[person]
              modPerson["name"] = person
              birthdaysToday.push(people[person]);
          } else if (daysDiff > 0 && daysDiff <= 14) {
            
              const modPerson = people[person]
              modPerson["daysUntilBirthday"] = Math.ceil(daysDiff)
              modPerson["name"] = person
              upcomingBirthdays.push(modPerson);
          }
      }
  }

  // Filter upcoming birthdays by contact_list
  const filteredUpcomingBirthdays = upcomingBirthdays.filter(person =>
    person.contact_list === "A List" || person.contact_list === "B List"
  );

  // Separate today's birthdays into two categories
  // A & Bs will be in the notification
  // C & Ds will be block ref'd to the DNP
  const aAndBBirthdaysToday = birthdaysToday.filter(person =>
    person.contact_list === "A List" || person.contact_list === "B List"
  );
  const otherBirthdaysToday = birthdaysToday.filter(person =>
    person.contact_list !== "A List" && person.contact_list !== "B List"
  );
   
  // check if there are lower priority birthdays
  const todaysDNPUID = window.roamAlphaAPI.util.dateToPageUid(new Date)
  if (isSecondDateAfter(lastBirthdayCheck, todaysDNPUID) & otherBirthdaysToday.length>0) {
     // block ref other today birthdays to the DNP
    const blockJSON = [
      {
          string: "**Birthdays Today**",
          children: otherBirthdaysToday.map(person => ({
              string: `[${person.name}](((${person.birthday_UID})))`
          }))
      }
    ];
    
    createChildren(todaysDNPUID, blockJSON)
  }
  
  
  return {
    aAndBBirthdaysToday,
    otherBirthdaysToday,
    filteredUpcomingBirthdays
  };
}

function remindersSystem(lastBirthdayCheck) {
  const people = OLDgetAllPeople()
  console.log(people);
  
  const toBeContacted = checkContacts(people) // {"toBeContacted": []}
  const birthdays = checkBirthdays(lastBirthdayCheck, people)
    
  const mergedReminders = {
      ... birthdays,
      ... toBeContacted
  }
  console.log("merged",mergedReminders);
  
  return mergedReminders
}

export default remindersSystem;

 


