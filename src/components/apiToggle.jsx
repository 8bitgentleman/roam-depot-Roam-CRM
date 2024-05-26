import React, { useState, useEffect } from 'react';
import { FormGroup, InputGroup, Switch, MenuItem } from "@blueprintjs/core";
import { Suggest } from '@blueprintjs/select';
// import iso3166 from 'iso-3166-2';

const SETTING_NAME_TOGGLE = 'religion-api-toggle';
const SETTING_NAME_TEXT = 'religion-api';
const SETTING_COUNTRY_CODE = 'religion-country-code';
const apiToggle = (extensionAPI) => {
    return () => {
        const [toggle, setToggle] = useState(extensionAPI.settings.get(SETTING_NAME_TOGGLE) || false);
        const [text, setText] = useState(extensionAPI.settings.get(SETTING_NAME_TEXT) || '');
        const [country, setCountry] = useState(extensionAPI.settings.get(SETTING_COUNTRY_CODE) || 'us');

        useEffect(() => {
            extensionAPI.settings.set(SETTING_NAME_TOGGLE, toggle);
        }, [toggle, extensionAPI]);

        useEffect(() => {
            extensionAPI.settings.set(SETTING_NAME_TEXT, text);
        }, [text, extensionAPI]);

        useEffect(() => {
            extensionAPI.settings.set(SETTING_COUNTRY_CODE, country);
        }, [country, extensionAPI]);

        const handleToggle = () => {
            setToggle(!toggle);
        }

        const handleTextChange = (event) => {
            setText(event.target.value);
        }

        const handleCountryChange = (event) => {
            setCountry(event.target.value);
        }

        return (
            <div>
                <Switch checked={toggle} label="Toggle" onChange={handleToggle} />
                <FormGroup
                    label={
                        <>
                        Country Code - <a href="https://en.wikipedia.org/wiki/ISO_3166-2#Current_codes" target="_blank" rel="noopener noreferrer">See List Here</a>
                        </>
                    }
                    labelFor="country-code-input"
                    >
                    <InputGroup 
                        id="country-code-input" 
                        disabled={!toggle} 
                        value={country} 
                        onChange={handleCountryChange} 
                        fill={false}
                        placeholder={country}
                        style={{ width: '10px', opacity: toggle ? 1 : 0.5 }} // Adjust width as needed
                    />
                </FormGroup>
                <FormGroup
                    label="API Key"
                    labelFor="text-input"
                >
                    <InputGroup 
                        id="text-input" 
                        disabled={!toggle} 
                        value={text} 
                        onChange={handleTextChange} 
                        fill={false}
                        style={{width: '100px', opacity: toggle ? 1 : 0.5}} // Adjust width as needed
                    />
                </FormGroup>
            </div>
        );
    }
}

export default apiToggle;