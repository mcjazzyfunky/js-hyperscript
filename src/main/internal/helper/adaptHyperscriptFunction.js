import parseHyperscript from './parseHyperscript';

const isEdge =
    typeof window === 'object'
        && window && 'msCredentials' in window && !!window.chrome;

export default function adaptHyperscriptFunction({
    createElement,
    isElement,
    adapterName,
    Fragment = null,
    cache = {}
}) {
    return function () {
        let 
            ret,
            args,
            type = arguments[0],
            hyperscriptRecords,
            lastHyperscriptRecord,
            props; 

        const
            argCount = arguments.length,
            firstArg = type,
            typeOfFirstArg = typeof firstArg,
            firstArgIsString = typeOfFirstArg === 'string',
            secondArg = arguments[1],

            skippedProps =
                secondArg !== undefined && secondArg !== null
                    && (typeof secondArg !== 'object'
                        || secondArg[Symbol.iterator]
                        || isElement(secondArg));

        if (firstArgIsString) {
            hyperscriptRecords = cache[firstArg];

            if (!hyperscriptRecords) {
                hyperscriptRecords = parseHyperscript(firstArg);

                if (!hyperscriptRecords) {
                    throw new Error(`Invalid hyperscript: ${firstArg}`);
                }

                cache[firstArg] = hyperscriptRecords;
            }

            lastHyperscriptRecord =
                hyperscriptRecords[hyperscriptRecords.length - 1];

            type = lastHyperscriptRecord.tag;
        } else if (firstArg === null && Fragment) {
            type = Fragment;
        } else if (!firstArgIsString
            && firstArg
            && firstArg.type
            && typeOfFirstArg === 'function') {
            
            // Supporting factories etc.
            type = firstArg.type;
        }

        // TODO - see "false" in next line
        if (false && hyperscriptRecords.length === 1 && lastHyperscriptRecord.props === null && !skippedProps) {
            ret = createElement.apply(undefined, arguments);
        } else {
            if (!skippedProps) {
                args = Array(argCount);

                args[0] = type;

                for (let i = 1; i < argCount; ++i) {
                    args[i] = arguments[i];
                }
            } else {
                args = Array(argCount + 1);
                
                args[0] = type;
                args[1] = null;

                for (let i = 1; i < argCount; ++i) {
                    args[i + 1] = arguments[i];
                }
            }

            props = skippedProps ? null : secondArg || null;

            if (!skippedProps
                && (!firstArgIsString
                    || (hyperscriptRecords.length === 1 && !lastHyperscriptRecord.props))) {
                
                ret = createElement.apply(null, args);
            } else {
                const
                    hasArgumentProps = !skippedProps && !!secondArg,
                    hasHyperscriptProps = lastHyperscriptRecord && !!lastHyperscriptRecord.props,
                    needsPropMerging = hasArgumentProps || hasHyperscriptProps;

                if (!needsPropMerging) {
                    if (hasArgumentProps) {
                        props = secondArg;
                    } else if (hasHyperscriptProps) {
                        props = lastHyperscriptRecord.props;
                    }
                } else {
                    props = {};

                    let className = null;

                    if (hasHyperscriptProps) {
                        const
                            entries = lastHyperscriptRecord.entries,
                            entryCount = entries.length;

                        for (let i = 0; i < entryCount; ++i) {
                            const
                                entry = entries[i],
                                key = entry[0],
                                value = entry[1];
                            
                            props[key] = value;
                        }

                        className = props.className || null;
                    }


                    if (hasArgumentProps) {
                        for (let key in secondArg) {
                            if (secondArg.hasOwnProperty(key)) {
                                props[key] = secondArg[key];
                            }
                        }

                        if (className !== null && secondArg.className) {
                            props.className = className + ' ' + secondArg.className;
                        }
                    }
                }

                args[1] = props;
                ret = createElement.apply(null, args);

                if (hyperscriptRecords && hyperscriptRecords.length > 1) {
                    for (let i = hyperscriptRecords.length - 2; i >= 0; --i) {
                        const data = hyperscriptRecords[i];

                        ret = createElement(data.tag, data.props, ret);
                    }
                }
            }
        }

        return ret;
    };
}
