import * as Blockly from 'blockly';

// Mock localize function
const localize = (text: string, params?: any) => {
    if (params) {
        let localized = text;
        Object.keys(params).forEach(key => {
            localized = localized.replace(`{{ ${key} }}`, params[key]);
        });
        return localized;
    }
    return text;
};

// Mock utils
const modifyContextMenu = (options: any[]) => {
    // Basic implementation or placeholder
};

const appendCollapsedProcedureBlocksFields = (block: any) => {
    // Basic implementation or placeholder
};

// SVG icons
const plusIconLight = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNMTIgNXYxNE01IDEyaDE0IiBzdHJva2U9IndoaXRlIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPjwvc3ZnPg==';
const plusIconDark = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNMTIgNXYxNE01IDEyaDE0IiBzdHJva2U9ImJsYWNrIiBzdHJva2Utd2lkdGg9IjIiIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCIvPjwvc3ZnPg==';

export const registerProcedureBlocks = (blockly: typeof Blockly) => {
    const B = blockly as any;

    B.Blocks.procedures_callnoreturn = {
        init() {
            this.arguments = [];
            this.argument_var_models = [];
            this.previousDisabledState = false;
            this.jsonInit(this.definition());
        },
        definition() {
            return {
                message0: '%1 %2',
                args0: [
                    {
                        type: 'field_label',
                        name: 'NAME',
                        text: this.id,
                    },
                    {
                        type: 'input_dummy',
                        name: 'TOPROW',
                    },
                ],
                inputsInline: true,
                colour: B.Colours?.Special2?.colour || '#00658e',
                colourSecondary: B.Colours?.Special2?.colourSecondary || '#00658e',
                colourTertiary: B.Colours?.Special2?.colourTertiary || '#00658e',
                previousStatement: null,
                nextStatement: null,
                tooltip: localize('Custom function'),
                category: B.Categories?.Functions || 'Functions',
            };
        },
        onchange(event: any) {
            if (!this.workspace || (B.derivWorkspace && B.derivWorkspace.isFlyoutVisible)) {
                return;
            }
            if (!event.recordUndo) return;

            if (event.type === B.Events.BLOCK_CREATE && event.ids.indexOf(this.id) !== -1) {
                const name = this.getProcedureCall();
                let def = B.Procedures.getDefinition(name, this.workspace);
                if (def && (def.type !== this.defType || JSON.stringify(def.arguments) !== JSON.stringify(this.arguments))) {
                    def = null;
                }
                if (def) {
                    this.data = def.id;
                    return;
                }
                B.Events.setGroup(event.group);
                const xml = document.createElement('xml');
                const block = document.createElement('block');
                block.setAttribute('type', this.defType);
                const xy = this.getRelativeToSurfaceXY();
                const x = xy.x + B.SNAP_RADIUS * (this.RTL ? -1 : 1);
                const y = xy.y + B.SNAP_RADIUS * 2;
                block.setAttribute('x', x.toString());
                block.setAttribute('y', y.toString());
                const mutation = this.mutationToDom();
                block.appendChild(mutation);
                const field = document.createElement('field');
                field.setAttribute('name', 'NAME');
                field.appendChild(document.createTextNode(this.getProcedureCall()));
                block.appendChild(field);
                xml.appendChild(block);
                B.Xml.domToWorkspace(xml, this.workspace);
                B.Events.setGroup(false);
                const procedure_definition = B.Procedures.getDefinition(name, this.workspace);
                this.data = procedure_definition.id;
            } else if (event.type === B.Events.BLOCK_DELETE) {
                const name = this.getProcedureCall();
                const def = B.Procedures.getDefinition(name, this.workspace);
                if (!def) {
                    B.Events.setGroup(event.group);
                    this.dispose(true, false);
                    B.Events.setGroup(false);
                }
            }
        },
        getProcedureDefinition(name: string) {
            return this.workspace.getTopBlocks(false).find((block: any) => {
                if (block.getProcedureDef) {
                    const tuple = block.getProcedureDef();
                    return tuple && B.Names.equals(tuple[0], name);
                }
                return false;
            });
        },
        getProcedureCall() {
            return this.getFieldValue('NAME');
        },
        renameProcedure(oldName: string, newName: string) {
            if (B.Names.equals(oldName, this.getProcedureCall())) {
                this.setFieldValue(newName, 'NAME');
            }
        },
        setProcedureParameters(paramNames: string[]) {
            this.arguments = [].concat(paramNames as any);
            this.argument_var_models = this.arguments.map((argumentName: string) =>
                B.Variables.getOrCreateVariablePackage(this.workspace, null, argumentName, '')
            );
            this.updateShape();
        },
        updateShape() {
            this.arguments.forEach((argumentName: string, i: number) => {
                let field = this.getField(`ARGNAME${i}`);
                if (field) {
                    B.Events.disable();
                    try {
                        field.setValue(argumentName);
                    } finally {
                        B.Events.enable();
                    }
                } else {
                    field = new B.FieldLabel(argumentName);
                    const input = this.appendValueInput(`ARG${i}`).appendField(field, `ARGNAME${i}`);
                    input.init();
                }
            });
            let i = this.arguments.length;
            while (this.getInput(`ARG${i}`)) {
                this.removeInput(`ARG${i}`);
                i++;
            }
            const topRow = this.getInput('TOPROW');
            if (topRow) {
                if (this.arguments.length) {
                    if (!this.getField('WITH')) {
                        topRow.appendField(localize('with:'), 'WITH');
                        topRow.init();
                    }
                } else if (this.getField('WITH')) {
                    topRow.removeField('WITH');
                }
            }
        },
        mutationToDom() {
            const container = document.createElement('mutation');
            container.setAttribute('name', this.getProcedureCall());
            this.arguments.forEach((argumentName: string) => {
                const parameter = document.createElement('arg');
                parameter.setAttribute('name', argumentName);
                container.appendChild(parameter);
            });
            return container;
        },
        domToMutation(xmlElement: Element) {
            const name = xmlElement.getAttribute('name');
            this.renameProcedure(this.getProcedureCall(), name || '');
            const args: string[] = [];
            const paramIds: string[] = [];
            xmlElement.childNodes.forEach((childNode: any) => {
                if (childNode.nodeName.toLowerCase() === 'arg') {
                    args.push(childNode.getAttribute('name'));
                    paramIds.push(childNode.getAttribute('paramId'));
                }
            });
            this.setProcedureParameters(args);
        },
        getVarModels() {
            return this.argument_var_models;
        },
        customContextMenu(options: any[]) {
            modifyContextMenu(options);
            const name = this.getProcedureCall();
            const { workspace } = this;
            const option: any = { enabled: true, text: localize('Highlight function definition'), callback: () => {
                const def = this.getProcedureDefinition(name);
                if (def) {
                    workspace.centerOnBlock(def.id);
                    def.select();
                }
            }};
            options.push(option);
        },
        defType: 'procedures_defnoreturn',
    };

    B.Blocks.procedures_callreturn = {
        init() {
            this.arguments = [];
            this.previousDisabledState = false;
            this.jsonInit(this.definition());
        },
        definition() {
            return {
                message0: '%1 %2',
                args0: [
                    {
                        type: 'field_label',
                        name: 'NAME',
                        text: this.id,
                    },
                    {
                        type: 'input_dummy',
                        name: 'TOPROW',
                    },
                ],
                output: null,
                outputShape: B.OUTPUT_SHAPE_ROUND,
                colour: B.Colours?.Special2?.colour || '#00658e',
                colourSecondary: B.Colours?.Special2?.colourSecondary || '#00658e',
                colourTertiary: B.Colours?.Special2?.colourTertiary || '#00658e',
                tooltip: localize('Custom function'),
                category: B.Categories?.Functions || 'Functions',
                inputsInline: true,
            };
        },
        onchange: B.Blocks.procedures_callnoreturn.onchange,
        getProcedureDefinition: B.Blocks.procedures_callnoreturn.getProcedureDefinition,
        getProcedureCall: B.Blocks.procedures_callnoreturn.getProcedureCall,
        renameProcedure: B.Blocks.procedures_callnoreturn.renameProcedure,
        setProcedureParameters: B.Blocks.procedures_callnoreturn.setProcedureParameters,
        updateShape: B.Blocks.procedures_callnoreturn.updateShape,
        mutationToDom: B.Blocks.procedures_callnoreturn.mutationToDom,
        domToMutation: B.Blocks.procedures_callnoreturn.domToMutation,
        getVarModels: B.Blocks.procedures_callnoreturn.getVarModels,
        customContextMenu: B.Blocks.procedures_callnoreturn.customContextMenu,
        defType: 'procedures_defreturn',
    };

    B.Blocks.procedures_defnoreturn = {
        init() {
            this.arguments = [];
            this.argument_var_models = [];
            this.is_adding = false;
            this.jsonInit(this.definition());
            const nameField = this.getField('NAME');
            if (B.Procedures && B.Procedures.rename) {
                nameField.setValidator(B.Procedures.rename);
            }
            const fieldImage = new B.FieldImage(plusIconLight, 24, 24, '+', () => this.onAddClick());
            this.appendDummyInput('ADD_ICON').appendField(fieldImage);
            this.setStatements(true);
        },
        definition() {
            return {
                message0: localize('function {{ function_name }} {{ function_params }}', {
                    function_name: '%1',
                    function_params: '%2',
                }),
                args0: [
                    {
                        type: 'field_input',
                        name: 'NAME',
                        text: '',
                    },
                    {
                        type: 'field_label',
                        name: 'PARAMS',
                        text: '',
                    },
                ],
                inputsInline: true,
                colour: B.Colours?.Special2?.colour || '#00658e',
                colourSecondary: B.Colours?.Special2?.colourSecondary || '#00658e',
                colourTertiary: B.Colours?.Special2?.colourTertiary || '#00658e',
                tooltip: localize('Function with no return value'),
                category: B.Categories?.Functions || 'Functions',
            };
        },
        onchange(event: any) {
            const allowedEvents = [B.Events.BLOCK_DELETE, B.Events.BLOCK_CREATE, B.Events.BLOCK_CHANGE];
            if (!this.workspace || (B.derivWorkspace && B.derivWorkspace.isFlyoutVisible) || !allowedEvents.includes(event.type)) {
                return;
            }
            if (event.type === B.Events.BLOCK_CREATE || B.Events.BLOCK_CHANGE) {
                if (event.blockId === this.id && event.name === 'NAME') {
                    this.getProcedureCallers().forEach((block: any) => {
                        block.setFieldValue(event.newValue, 'NAME');
                    });
                }
                appendCollapsedProcedureBlocksFields(this);
            }
        },
        onAddClick() {
            if (this.is_adding || this.workspace.options.readOnly || (B.derivWorkspace && B.derivWorkspace.isFlyoutVisible)) {
                return;
            }
            this.is_adding = true;
            setTimeout(() => {
                const promptMessage = localize('Specify a parameter name:');
                const paramName = window.prompt(promptMessage, '');
                if (paramName) {
                    const variable = B.Variables.getOrCreateVariablePackage(this.workspace, null, paramName, '');
                    if (variable) {
                        this.arguments.push(paramName);
                        this.argument_var_models.push(variable);
                        const paramField = this.getField('PARAMS');
                        paramField.setText(`${localize('with: ')} ${this.arguments.join(', ')}`);
                        this.getProcedureCallers().forEach((block: any) => {
                            block.setProcedureParameters(this.arguments);
                            block.initSvg();
                            block.renderEfficiently ? block.renderEfficiently() : block.render();
                        });
                    }
                }
                this.is_adding = false;
            }, 0);
        },
        setStatements(hasStatements: boolean) {
            if (this.hasStatements === hasStatements) return;
            if (hasStatements) {
                this.appendStatementInput('STACK').appendField('');
                if (this.getInput('RETURN')) {
                    this.moveInputBefore('STACK', 'RETURN');
                }
            } else {
                this.removeInput('STACK', true);
            }
            this.hasStatements = hasStatements;
        },
        updateParams() {
            let paramString = '';
            if (this.arguments.length) {
                paramString = `${localize('with:')} ${this.arguments.join(', ')}`;
            }
            B.Events.disable();
            try {
                this.setFieldValue(paramString, 'PARAMS');
            } finally {
                B.Events.enable();
            }
        },
        mutationToDom(optParamIds: boolean) {
            const container = document.createElement('mutation');
            if (optParamIds) {
                container.setAttribute('name', this.getFieldValue('NAME'));
            }
            this.argument_var_models.forEach((arg: any, i: number) => {
                const parameter = document.createElement('arg');
                parameter.setAttribute('name', arg.name);
                parameter.setAttribute('varid', arg.getId());
                container.appendChild(parameter);
            });
            if (!this.hasStatements) {
                container.setAttribute('statements', 'false');
            }
            return container;
        },
        domToMutation(xmlElement: Element) {
            this.arguments = [];
            this.argument_var_models = [];
            xmlElement.childNodes.forEach((childNode: any) => {
                if (childNode.nodeName.toLowerCase() === 'arg') {
                    const var_name = childNode.getAttribute('name');
                    const var_id = childNode.getAttribute('varid') || childNode.getAttribute('varId');
                    const variable = B.Variables.getOrCreateVariablePackage(this.workspace, var_id, var_name, '');
                    this.arguments.push(var_name);
                    if (variable !== null) {
                        this.argument_var_models.push(variable);
                    }
                }
            });
            this.updateParams();
            this.setStatements(xmlElement.getAttribute('statements') !== 'false');
        },
        getProcedureDef() {
            return [this.getFieldValue('NAME'), this.arguments, false];
        },
        getProcedureCallers() {
            return this.workspace.getAllBlocks(false).filter((block: any) => block.type === this.callType && block.data === this.id);
        },
        getVars() {
            return this.arguments;
        },
        getVarModels() {
            return this.argument_var_models;
        },
        customContextMenu(options: any[]) {
            modifyContextMenu(options);
            if (B.derivWorkspace && B.derivWorkspace.isFlyoutVisible) return;
            const option: any = { enabled: true };
            const name = this.getFieldValue('NAME');
            option.text = localize('Create "%1"').replace('%1', name);
            const xmlMutation = document.createElement('mutation');
            xmlMutation.setAttribute('name', name);
            this.arguments.forEach((argumentName: string) => {
                const xmlArg = document.createElement('arg');
                xmlArg.setAttribute('name', argumentName);
                xmlMutation.appendChild(xmlArg);
            });
            const xmlBlock = document.createElement('block');
            xmlBlock.setAttribute('type', this.callType);
            xmlBlock.appendChild(xmlMutation);
            option.callback = B.ContextMenu.callbackFactory(this, xmlBlock);
            options.push(option);
        },
        callType: 'procedures_callnoreturn',
    };

    B.Blocks.procedures_defreturn = {
        init() {
            this.arguments = [];
            this.argument_var_models = [];
            this.jsonInit(this.definition());
            const nameField = this.getField('NAME');
            if (B.Procedures && B.Procedures.rename) {
                nameField.setValidator(B.Procedures.rename);
            }
            const fieldImage = new B.FieldImage(plusIconDark, 24, 24, '+', () => this.onAddClick());
            this.appendDummyInput('ADD_ICON').appendField(fieldImage);
            this.moveInputBefore('ADD_ICON', 'RETURN');
            this.setStatements(true);
        },
        definition() {
            return {
                message0: localize('function {{ function_name }} {{ function_params }} {{ dummy }}', {
                    function_name: '%1',
                    function_params: '%2',
                    dummy: '%3',
                }),
                message1: 'return %1',
                args0: [
                    {
                        type: 'field_input',
                        name: 'NAME',
                        text: '',
                    },
                    {
                        type: 'field_label',
                        name: 'PARAMS',
                        text: '',
                    },
                    {
                        type: 'input_dummy',
                    },
                ],
                args1: [
                    {
                        type: 'input_value',
                        name: 'RETURN',
                        check: null,
                    },
                ],
                inputsInline: true,
                colour: B.Colours?.Special2?.colour || '#00658e',
                colourSecondary: B.Colours?.Special2?.colourSecondary || '#00658e',
                colourTertiary: B.Colours?.Special2?.colourTertiary || '#00658e',
                tooltip: localize('Function that returns a value'),
                category: B.Categories?.Functions || 'Functions',
            };
        },
        onAddClick: B.Blocks.procedures_defnoreturn.onAddClick,
        onchange: B.Blocks.procedures_defnoreturn.onchange,
        setStatements: B.Blocks.procedures_defnoreturn.setStatements,
        updateParams: B.Blocks.procedures_defnoreturn.updateParams,
        mutationToDom: B.Blocks.procedures_defnoreturn.mutationToDom,
        domToMutation: B.Blocks.procedures_defnoreturn.domToMutation,
        getProcedureDef() {
            return [this.getFieldValue('NAME'), this.arguments, true];
        },
        getProcedureCallers: B.Blocks.procedures_defnoreturn.getProcedureCallers,
        getVars: B.Blocks.procedures_defnoreturn.getVars,
        getVarModels: B.Blocks.procedures_defnoreturn.getVarModels,
        customContextMenu: B.Blocks.procedures_defnoreturn.customContextMenu,
        callType: 'procedures_callreturn',
    };

    B.Blocks.procedures_ifreturn = {
        init() {
            this.hasReturnValue = true;
            this.jsonInit(this.definition());
        },
        definition() {
            return {
                message0: localize('if {{ condition }} return {{ value }}', { condition: '%1', value: '%2' }),
                args0: [
                    {
                        type: 'input_value',
                        name: 'CONDITION',
                    },
                    {
                        type: 'input_value',
                        name: 'VALUE',
                    },
                ],
                inputsInline: true,
                colour: B.Colours?.Special2?.colour || '#00658e',
                colourSecondary: B.Colours?.Special2?.colourSecondary || '#00658e',
                colourTertiary: B.Colours?.Special2?.colourTertiary || '#00658e',
                previousStatement: null,
                nextStatement: null,
                tooltip: localize('Prematurely returns a value within a function'),
                category: B.Categories?.Functions || 'Functions',
            };
        },
        mutationToDom() {
            const container = document.createElement('mutation');
            container.setAttribute('value', Number(this.hasReturnValue).toString());
            return container;
        },
        domToMutation(xmlElement: Element) {
            const value = xmlElement.getAttribute('value');
            this.hasReturnValue = value === '1';
            if (!this.hasReturnValue) {
                this.removeInput('VALUE');
                this.appendDummyInput('VALUE').appendField(localize('return'));
                this.initSvg();
                this.renderEfficiently ? this.renderEfficiently() : this.render();
            }
        },
        onchange() {
            if (!this.workspace.isDragging || this.workspace.isDragging()) return;
            let legal = false;
            let block = this;
            do {
                if (['procedures_defnoreturn', 'procedures_defreturn'].indexOf(block.type) !== -1) {
                    legal = true;
                    break;
                }
                block = block.getSurroundParent();
            } while (block);
            if (legal) {
                const rerender = () => {
                    this.initSvg();
                    this.renderEfficiently ? this.renderEfficiently() : this.render();
                };
                if (block.type === 'procedures_defnoreturn' && this.hasReturnValue) {
                    this.removeInput('VALUE');
                    this.appendDummyInput('VALUE').appendField(localize('return'));
                    rerender();
                    this.hasReturnValue = false;
                } else if (block.type === 'procedures_defreturn' && !this.hasReturnValue) {
                    this.removeInput('VALUE');
                    this.appendValueInput('VALUE').appendField(localize('return'));
                    rerender();
                    this.hasReturnValue = true;
                }
                this.setDisabled(false);
            } else if (!this.getInheritedDisabled()) {
                this.setDisabled(true);
            }
        },
    };
};
