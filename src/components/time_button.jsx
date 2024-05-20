import React, { useState } from 'react';

function TimeButton({ extensionAPI }) {
    // Declare a new state variable, which we'll call "count"
    // TODO fix this settings so it can be passed in
    const [count, setCount] = useState(extensionAPI.settings.get('timer'));

    return (
        <input
            className="rm-settings-panel__value bp3-input"
            style={{
                width: '75px',
                border: '1px #394B59 solid',
                borderRadius: '5px',
                padding: '7px 10px',
                backgroundColor: '#182026',
            }}
            type="number"
            min="1"
            value={count}
            placeholder={count}
            onChange={(evt) => { 
                setCount(evt.target.value);
                extensionAPI.settings.set('timer', evt.target.value);
            }}
        />
    );
}

export default TimeButton;