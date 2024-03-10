# Roam CRM

Roam CRM is an extension to turn your Roam graph into a _Relationship Management_ tool. Inspired by [Sivers](https://sive.rs/hundreds) and David Rockefeller's collection of [200,000 index cards](https://archive.is/zxbCA), Roam CRM at its core strives to keep the people and dates important to you top of mind.

## Setup

Roam CRM relies on several excellent Roam extensions to extend it's functionalithy. All extensions can be installed via Roam Depot

-   Google extension by David Vargas & Michael Gartner

    1. Lets Roam CRM access your calendar to create new people and interactions in the daily note.
    2. Follow the extension's instructions to log into your google account and add a calendar.

-   Workbench by David Vargas & Michael Gartner

    1. Install the extension and enable the Attribute Select Feature
    2. Navigate to the newly created page `[[roam/js/attribute-select]]`
    3. Add the attribute `Contact Frequency`
    4. Add 4 options
        - #[[A List]]: Contact every two weeks
        - #[[B List]]: Contact every two months
        - #[[C List]]: Contact every six months
        - #[[D List]]: Contact once a year
        - #[[F List]]: Never contact

-   Query Builder by David Vargas & Michael Gartner

## Usage

### Agenda Adder

-   Inefficient leaders waste a lot of time reaching out about or responding to one-off issues in real time. A much more efficient method is to batch your issues and discuss them all at once.
-   Make a block anywhere that has as persons name `[[Bill Gates]]` and a hashtag `#Agenda`
-   Roam CRM will automatically nest your block on Bill's page under an agenda attribute
-   Next time you talk, you'll remember everything you wanted to tell Bill!

### Metadata

-   We create metadata for each `#people` page inspired by [Matt Mochary](https://docs.google.com/spreadsheets/d/1Ti_xaV9IVvj-bklxOjNY-IeGsC-YqcgvB03qvfFQrnI/)

### Contact Reminders

-   Set contact frequency reminders for each person - #[[A List]]: Contact every two weeks - #[[B List]]: Contact every two months - #[[C List]]: Contact every six months - #[[D List]]: Contact once a year - #[[F List]]: Never contact
-   A modal on the daily note remind you to contact someone

### Birthday Reminders

-   Birthday reminders happen 14 days before, and on day of. They remind you 'Bill Gates turned 46 today.'

## Example

<img src="LINK_TO_IMAGE" max-width="400"></img>
