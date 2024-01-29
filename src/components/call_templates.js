import createBlock from "roamjs-components/writes/createBlock"

function createLastWeekCalls(parentUid) {
    createBlock({
        parentUid:parentUid,
        node:{
            text: `Calls in the Last Week`,
            heading:1,
            children:[
            {
                text: `{{query block}} #.rollup-table`,
                open:false,
                children:[
                {
                    text: `results`,
                    children:[
                    {
                        text: `layout`,
                        children:[
                        {
                            text: `rowStyle`,
                            children:[
                            {
                                text: `Bare`,
                                children:[
                                
                                ]
                            }
                            ]
                        }
                        ]
                    },
                    {
                        text: `interface`,
                        children:[
                        {
                            text: `show`,
                        }
                        ]
                    },
                    {
                        text: `views`,
                        children:[
                        {
                            text: `Notes`,
                            children:[
                            {
                                text: `link`,
                            }
                            ]
                        },
                        {
                            text: `Next Actions`,
                            children:[
                            {
                                text: `embed`,
                            }
                            ]
                        }
                        ]
                    },
                    {
                        text: `sorts`,
                        children:[
                        {
                            text: `text`,
                            children:[
                            {
                                text: `false`,
                            }
                            ]
                        },
                        {
                            text: `Next`,
                            children:[
                            {
                                text: `false`,
                            }
                            ]
                        }
                        ]
                    },
                    ]
                },
                {
                    text: `scratch`,
                    children: [
                    {
                        text: `custom`
                    },
                    {
                        text: `selections`,
                        children: [
                        {
                            text: `node`,
                            children: [
                            {
                                text: `Notes`,
                                
                            }
                            ]
                        },
                        {
                            text: `node:NEXT`,
                            children: [
                            {
                                text: `Next Actions`,
                                
                            }
                            ]
                        }
                        ]
                    },
                    {
                        text:`conditions`,
                        children:[
                            {
                                text:`clause`,
                                children:[
                                    {
                                        text:`source`,
                                        children:[
                                            {
                                                text:`node`,
                                                
                                            }
                                        ]
                                    },
                                    {
                                        text:`Relation`,
                                        children:[
                                            {
                                                text:`references title`,
                                            }
                                        ]
                                    },
                                    {
                                        text:`target`,
                                        children:[
                                            {
                                                text:`Call`,
                                            }
                                        ]
                                    }
                                ]
                            },
                            {
                                text:`clause`,
                                children:[
                                    {
                                        text:`source`,
                                        children:[
                                            {
                                                text:`node`,
                                                
                                            }
                                        ]
                                    },
                                    {
                                        text:`Relation`,
                                        children:[
                                            {
                                                text:`has attribute`,
                                            }
                                        ]
                                    },
                                    {
                                        text:`target`,
                                        children:[
                                            {
                                                text:`Next Actions`,
                                            }
                                        ]
                                    }
                                ]
                            },
                            {
                                text:`clause`,
                                children:[
                                    {
                                        text:`source`,
                                        children:[
                                            {
                                                text:`node`,
                                                
                                            }
                                        ]
                                    },
                                    {
                                        text:`Relation`,
                                        children:[
                                            {
                                                text:`has descendant`,
                                            }
                                        ]
                                    },
                                    {
                                        text:`target`,
                                        children:[
                                            {
                                                text:`NEXT`,
                                            }
                                        ]
                                    }
                                ]
                            },
                            {
                                text:`clause`,
                                children:[
                                    {
                                        text:`source`,
                                        children:[
                                            {
                                                text:`NEXT`,
                                                
                                            }
                                        ]
                                    },
                                    {
                                        text:`Relation`,
                                        children:[
                                            {
                                                text:`with text`,
                                            }
                                        ]
                                    },
                                    {
                                        text:`target`,
                                        children:[
                                            {
                                                text:`Next Actions:`,
                                            }
                                        ]
                                    }
                                ]
                            },
                            {
                                text:`clause`,
                                children:[
                                    {
                                        text:`source`,
                                        children:[
                                            {
                                                text:`node`,
                                                
                                            }
                                        ]
                                    },
                                    {
                                        text:`Relation`,
                                        children:[
                                            {
                                                text:`created after`,
                                            }
                                        ]
                                    },
                                    {
                                        text:`target`,
                                        children:[
                                            {
                                                text:`one week ago`,
                                            }
                                        ]
                                    }
                                ]
                            },
                        ]
                    }
                    ]
                }
                ]
            }
            ]
        }
    })
}

function createLastMonthCalls(parentUid) {
    createBlock({
        parentUid:parentUid,
        node:{
            text: `Calls in the Last Month`,
            heading:1,
            children:[
            {
                text: `{{query block}} #.rollup-table`,
                open:false,
                children:[
                {
                    text: `results`,
                    children:[
                    {
                        text: `layout`,
                        children:[
                        {
                            text: `rowStyle`,
                            children:[
                            {
                                text: `Bare`,
                                children:[
                                
                                ]
                            }
                            ]
                        }
                        ]
                    },
                    {
                        text: `interface`,
                        children:[
                        {
                            text: `show`,
                        }
                        ]
                    },
                    {
                        text: `views`,
                        children:[
                        {
                            text: `Notes`,
                            children:[
                            {
                                text: `link`,
                            }
                            ]
                        },
                        {
                            text: `Next Actions`,
                            children:[
                            {
                                text: `embed`,
                            }
                            ]
                        }
                        ]
                    },
                    {
                        text: `sorts`,
                        children:[
                        {
                            text: `text`,
                            children:[
                            {
                                text: `false`,
                            }
                            ]
                        },
                        {
                            text: `Next`,
                            children:[
                            {
                                text: `false`,
                            }
                            ]
                        }
                        ]
                    },
                    ]
                },
                {
                    text: `scratch`,
                    children: [
                    {
                        text: `custom`
                    },
                    {
                        text: `selections`,
                        children: [
                        {
                            text: `node`,
                            children: [
                            {
                                text: `Notes`,
                                
                            }
                            ]
                        },
                        {
                            text: `node:NEXT`,
                            children: [
                            {
                                text: `Next Actions`,
                                
                            }
                            ]
                        },
                        {
                            text: `node:NEXT:created date`,
                            children: [
                            {
                                text: `Created Date`,
                                
                            }
                            ]
                        }
                        ]
                    },
                    {
                        text:`conditions`,
                        children:[
                            {
                                text:`clause`,
                                children:[
                                    {
                                        text:`source`,
                                        children:[
                                            {
                                                text:`node`,
                                                
                                            }
                                        ]
                                    },
                                    {
                                        text:`Relation`,
                                        children:[
                                            {
                                                text:`references title`,
                                            }
                                        ]
                                    },
                                    {
                                        text:`target`,
                                        children:[
                                            {
                                                text:`Call`,
                                            }
                                        ]
                                    }
                                ]
                            },
                            {
                                text:`clause`,
                                children:[
                                    {
                                        text:`source`,
                                        children:[
                                            {
                                                text:`node`,
                                                
                                            }
                                        ]
                                    },
                                    {
                                        text:`Relation`,
                                        children:[
                                            {
                                                text:`has attribute`,
                                            }
                                        ]
                                    },
                                    {
                                        text:`target`,
                                        children:[
                                            {
                                                text:`Next Actions`,
                                            }
                                        ]
                                    }
                                ]
                            },
                            {
                                text:`clause`,
                                children:[
                                    {
                                        text:`source`,
                                        children:[
                                            {
                                                text:`node`,
                                                
                                            }
                                        ]
                                    },
                                    {
                                        text:`Relation`,
                                        children:[
                                            {
                                                text:`has descendant`,
                                            }
                                        ]
                                    },
                                    {
                                        text:`target`,
                                        children:[
                                            {
                                                text:`NEXT`,
                                            }
                                        ]
                                    }
                                ]
                            },
                            {
                                text:`clause`,
                                children:[
                                    {
                                        text:`source`,
                                        children:[
                                            {
                                                text:`NEXT`,
                                                
                                            }
                                        ]
                                    },
                                    {
                                        text:`Relation`,
                                        children:[
                                            {
                                                text:`with text`,
                                            }
                                        ]
                                    },
                                    {
                                        text:`target`,
                                        children:[
                                            {
                                                text:`Next Actions:`,
                                            }
                                        ]
                                    }
                                ]
                            },
                            {
                                text:`clause`,
                                children:[
                                    {
                                        text:`source`,
                                        children:[
                                            {
                                                text:`node`,
                                                
                                            }
                                        ]
                                    },
                                    {
                                        text:`Relation`,
                                        children:[
                                            {
                                                text:`created after`,
                                            }
                                        ]
                                    },
                                    {
                                        text:`target`,
                                        children:[
                                            {
                                                text:`one month ago`,
                                            }
                                        ]
                                    }
                                ]
                            },
                        ]
                    }
                    ]
                }
                ]
            }
            ]
        }
    })
}

function createCallTemplates(parentUid) {
    createBlock({
        parentUid:parentUid,
        order:"last",
        node:{
            text: `call template #SmartBlock`,
            children:[
            {
                text: `[[Call]] with `,
                children:[
                {
                    text: `Notes::`,
                    children:[
                    {
                        text: ` `,
                        
                    },
                    
                    ]
                },
                {
                    text: `Next Actions::`,
                    children:[
                    {
                        text: ` `,
                        
                    },
                    
                    ]
                },
                ]
            }
            ]
        }
    })
}

function createPersonTemplates(parentUid) {
    createBlock({
        parentUid:parentUid,
        order:"last",
        node:{
            text: `person metadata #SmartBlock`,
            children:[
                {
                    text: `Metadata::`,
                    children:[
                        {text: `Phone Number::`},
                        {text: `Email:: {{Email Setup:42SmartBlock:email button}}`},
                        {text: `Location::`},
                        {text: `Company::`},
                        {text: `Role::`},
                        {text: `How We Met::`},
                        {text: `Social Media::`},
                        {text: `Tags::#people `},
                    ]
                },
                {
                    text: `Relationship Metadata::`,
                    children:[
                        {text: `Contact Frequency:: #[[C List]]: Contact every six months`},
                        {text: `Last Contacted::`},
                        {text: `Birthday::`},
                        {text: `Partner::`},
                        {text: `Kid::`},
                        {text: `Pet::`},
                        {text: `What I do for fun::`},
                        {text: `What I did for fun as a kid::`},
                        {text: `Town I was born in::`},
                        {text: `Favorite food::`},
                        {text: `Favorite place to visit::`},
                        {text: `Ask me about::`},
                    ]
                }
            ]
        }
    })
}

export { createLastWeekCalls,
    createLastMonthCalls,
    createCallTemplates,
    createPersonTemplates };