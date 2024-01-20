 
function findUpcomingBirthdays(data) {
  const today = new Date();
  const twoWeeksLater = new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000);
  const upcomingBirthdays = [];

  for (const person in data) {
      if (data.hasOwnProperty(person)) {
          const birthdayStr = data[person].birthday;
          const birthday = new Date(birthdayStr);
          // Adjust the birthday year to this year for comparison
          birthday.setFullYear(today.getFullYear());

          // Check if the birthday has already occurred this year, if so, set to next year.
          if (birthday < today) {
              birthday.setFullYear(today.getFullYear() + 1);
          }

          if (birthday >= today && birthday <= twoWeeksLater) {
              upcomingBirthdays.push({ name: person, birthday: birthday.toISOString() });
          }
      }
  }

  return upcomingBirthdays;
}

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

function getAllPeople() {
  let query = `[:find 
    (pull ?node [:block/string :block/uid])
    (pull ?PAGE [:node/title])
    (pull ?CONTACTdec [[:node/title :as :contact-title] [:block/string :as :contact-string] :block/refs {:block/refs ...}])
  :where
    [?Birthday-Ref :node/title "Birthday"]
    [?Tags-Ref :node/title "Tags"]
    [?person-Ref :node/title "people"]
    [?ContactFrequency-Ref :node/title "Contact Frequency"]
    [?node :block/refs ?Birthday-Ref]
    [?node :block/page ?PAGE]
    [?PEOPLEdec :block/parents ?PAGE]
    [?PEOPLEdec :block/refs ?Tags-Ref]
    [?PEOPLEdec :block/refs ?person-Ref]
    [?CONTACTdec :block/parents ?PAGE]
    [?CONTACTdec :block/refs ?ContactFrequency-Ref]
    (not
      [?not_populated-Ref :node/title "not_populated"]
      [?PEOPLEdec :block/refs ?not_populated-Ref]
    )
  ]`;

  let results = window.roamAlphaAPI.q(query).flat();

  let mappedResults = {};
  // Iterate through results three at a time
  for (let i = 0; i < results.length; i += 3) {
  let node = results[i];
  let page = results[i + 1];
  let contact = results[i + 2];

  // Merge the node and page objects
  let mergedObject = {
  ...node, // Spread the properties of the node object
  ...page,  // Spread the properties of the page object
  ...contact
  };

  // parse birthday date
  const dateString = mergedObject.string.split("::", 2)[1].replace(/\[|\]/g, '');
  // console.log(dateString);
  // mergedObject.birthday = parseStringToDate(dateString.trim())
  // console.log(birthdays);

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

  mappedResults[mergedObject['title']] = {
  "birthday":parseStringToDate(dateString.trim()),
  "contact_list":mergedObject.contact,
  "birthday_UID":mergedObject['uid'],
  "last_contact":null
  }

  // mappedResults.push(mergedObject);
  }

  return mappedResults;
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

function checkBirthdays(lastBirthdayCheck) {
  const people = getAllPeople()
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
  if (otherBirthdaysToday.length > 0) {
     // block ref other today birthdays to the DNP
    const blockJSON = [
      {
          string: "**Birthdays Today**",
          children: otherBirthdaysToday.map(person => ({
              string: `[${person.name}](((${person.birthday_UID})))`
          }))
      }
    ];
    const todaysDNPUID = window.roamAlphaAPI.util.dateToPageUid(new Date)
    createChildren(todaysDNPUID, blockJSON)
  }
  
  
  return {
    aAndBBirthdaysToday,
    otherBirthdaysToday,
    filteredUpcomingBirthdays
  };
}

export default checkBirthdays;

 


