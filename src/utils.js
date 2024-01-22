 
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

function getAllPeople() {
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
  const people = getAllPeople()
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

 


