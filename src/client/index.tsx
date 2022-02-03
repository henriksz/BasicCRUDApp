import ReactDOM from "react-dom"
import React from "react"
import "./styles_v1.css"



if(module.hot) {
    module.hot.accept() // eslint-disable-line no-undef  
}


enum AppMode {
    NORMAL,
    DELETED
}

enum InventoryItemMode  {
    NORMAL,
    EDIT,
    DELETE
}

interface MutableInventoryItemData {
    name: string,
    count: number
}

interface InventoryItemData extends MutableInventoryItemData {
    id: number
}

interface DeletedInventoryItemData extends InventoryItemData {
    comment: string
}

interface ErrorMessage {
    name: string,
    message: string
}

class App extends React.Component {
    state: {
        mode: AppMode,
        entries: Array<InventoryItemData>,
        deletedEntries: Array<DeletedInventoryItemData>,
        errors: Array<ErrorMessage>
    }

    constructor(props: any) {
        super(props)

        this.state = {
            mode: AppMode.NORMAL,
            entries: [],
            deletedEntries: [],
            errors: []
        }
    }

    switchToMode(mode: AppMode) {
        let state = {...this.state}
        state.mode = mode

        this.setState(state)
    }

    render() {
        return (
            <React.StrictMode>
                {
                    this.state.errors.map((error, index) => {
                        return <ErrorBox errorMessage={error} key={index} id={index}
                            onDismissal={(id: number) => this.removeErrorMessage(id)}/>
                    })
                }
                <ItemCreator onItemCreation={() => this.loadEntries()}
                    onErrorResponse={(response: any) => this.onErrorResponse(response)}/>
                {this.getSwitchButton()}
                {this.getActiveTable()}
            </React.StrictMode>
        )
    }

    getSwitchButton() {
        switch (this.state.mode) {
            case AppMode.DELETED:
                return <button onClick={() => this.switchToMode(AppMode.NORMAL)}>to normal</button>
            default:
                return <button onClick={() => this.switchToMode(AppMode.DELETED)}>to deleted</button>
        }
    }

    getActiveTable() {
        switch (this.state.mode) {
            case AppMode.DELETED:
                return <DeletedInventoryTable entries={this.state.deletedEntries}
                    onReloadRequest={() => this.loadDeletedEntries()
                        .catch(error => this.onErrorResponse(error))}
                    onItemRestore={(id: number) => this.removeLocalDeletedEntry(id)}
                    onErrorResponse={(response: any) => this.onErrorResponse(response)}/>
            default:
                return <InventoryTable entries={this.state.entries}
                onItemDelete={(id: number) => this.removeLocalEntry(id)}
                onReloadRequest={() => this.loadEntries()
                    .catch(error => this.onErrorResponse(error))}
                onErrorResponse={(response: any) => this.onErrorResponse(response)}/>
        }
    }

    componentDidMount() {
        this.loadEntries()
        .then(() => {
             return this.loadDeletedEntries()
        })
    }

    componentDidUpdate(prevProps: Readonly<{}>,
        prevState: Readonly<{
        mode: AppMode,
        entries: Array<InventoryItemData>,
        deletedEntries: Array<DeletedInventoryItemData>
    }>) {
        if (prevState.mode != this.state.mode) {
            switch (this.state.mode) {
                case AppMode.DELETED:
                    this.loadDeletedEntries()
                    break
                default:
                    this.loadEntries()
            }
        }
    }

    loadDeletedEntries() {
        return fetch("/inventory/deleted")
        .then((response) => {
            if (response.ok)
                return response.json()
            else
                return Promise.reject(response)
        })
        .then(data =>{
            let state = {...this.state}
            state.deletedEntries = data

            this.setState(state)
        }, error => {
            this.onErrorResponse(error)
        })
    }

    loadEntries() {
        return fetch("/inventory")
        .then((response: any) => {
            if (response.ok)
                return response.json()
            else
                return Promise.reject(response)
        })
        .then(data => {
            let state= {...this.state}
            state.entries = data

            this.setState(state)
        }, error => {
            this.onErrorResponse(error)
        })
    }

    removeLocalEntry(id: number) {
        let state = {...this.state}
        state.entries = state.entries.filter((item) => {
            return item.id != id
        })

        this.setState(state)
    }

    removeLocalDeletedEntry(id: number) {
        let state = {...this.state}
        state.deletedEntries = state.deletedEntries.filter((item) => {
            return item.id != id
        })

        this.setState(state)
    }

    removeErrorMessage(id: number) {
        let state = {...this.state}
        state.errors.splice(id, 1)

        this.setState(state)
    }

    onErrorResponse(response: any) {
        response.json()
        .then((errorMessage: ErrorMessage) => {
            let state = {...this.state}
            state.errors.push(errorMessage)

            this.setState(state)
        })
    }
}

class ErrorBox extends React.Component {
    props: {
        errorMessage: ErrorMessage,
            id: number,
            onDismissal: Function
        }

    render() {
        return (
            <div className="error-box">
                <button onClick={() => this.props.onDismissal(this.props.id)}>
                    dismiss
                </button>
                <span className="error-name">
                    {this.props.errorMessage.name}
                </span>
                <span>
                    {this.props.errorMessage.message}
                </span>
            </div>
        )
    }
}

class ItemCreator extends React.Component {
    newValues: MutableInventoryItemData
    props: {onItemCreation: Function, onErrorResponse: Function}

    constructor(props: {onItemCreation: Function, onError: Function}) {
        super(props)

        this.newValues = {
            name: "",
            count: 0
        }
    }

    render() {
        return (
            <table>
                <thead>
                    <tr>
                        <th>
                            New Name
                        </th>
                        <th>
                            New Count
                        </th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>
                            <input onChange={evt => this.newValues.name = evt.target.value}/>
                        </td>
                        <td>
                            <input type="number"
                            onChange={evt => this.newValues.count = Number.parseInt(evt.target.value)}/>
                        </td>
                        <td>
                            <button onClick={() => this.saveNew()}>
                                Add
                            </button>
                        </td>
                    </tr>
                </tbody>
            </table>
        )
    }

    saveNew() {
        if (this.newValues.name && this.newValues.count) {
            fetch("/inventory/item/new",
                { 
                    method: "POST",
                    body: JSON.stringify(this.newValues),
                    headers: { 'Content-Type': 'application/json' }
                }
            )
            .then((response: any) => {
                if (response.ok)
                    this.props.onItemCreation()
                else
                    this.props.onErrorResponse(response)
            })
        }
    }
}


class InventoryTable extends React.Component {
    props: {
        entries: Array<InventoryItemData>,
        onReloadRequest: Function,
        onItemDelete: Function,
        onErrorResponse: Function
    }

    render() {
        return (
            <React.StrictMode>
            <table className="table-data-any">
                <thead>
                    <tr>
                        <th>Item Name</th>
                        <th>Item Count</th>
                        <th></th>
                        <th>
                            <button onClick={() => this.props.onReloadRequest()}>
                                reload
                            </button>
                        </th>
                    </tr>
                </thead>
                <tbody>
                    {
                        this.props.entries.map((item) => {
                            return <InventoryItem data={item} key={item.id}
                                onDelete={(id: number) => this.props.onItemDelete(id)}
                                onErrorResponse={(response: any) => this.props.onErrorResponse(response)}/>
                        })
                    }
                </tbody>
            </table>
            </React.StrictMode>
        )
    }
}


class InventoryItem extends React.Component {
    modifications: MutableInventoryItemData
    deletion_comment: string
    state: { mode: InventoryItemMode, data: InventoryItemData }
    props:  { data: InventoryItemData, onDelete: Function, onErrorResponse: Function }


    constructor(props:  { data: InventoryItemData, onDelete: Function, onErrorResponse: Function }) {
        super(props)

        this.state = {
            mode: InventoryItemMode.NORMAL,
            data: props.data,
        }

        this.modifications = {
            name: "",
            count: 0
        }
        this.deletion_comment = ""
    }

    render() {
        switch (this.state.mode) {
            case InventoryItemMode.EDIT:
                return this.editMode()
            case InventoryItemMode.DELETE:
                return this.deleteMode()
            default:
                return this.normalMode()
        }
    }

    normalMode() {
        return (
            <tr>
                <td>{this.state.data.name}</td>
                <td>{this.state.data.count}</td>
                <td><button onClick={() => this.switchToMode(InventoryItemMode.EDIT)}>edit</button></td>
                <td><button onClick={() => this.switchToMode(InventoryItemMode.DELETE)}>delete</button></td>
            </tr>
        )
    }

    editMode() {
        return (
            <tr>
                <td>
                    <input defaultValue={this.state.data.name} 
                        onChange={evt => this.modifications.name = evt.target.value}/>
                </td>
                <td>
                    <input type="number" defaultValue={this.state.data.count} 
                        onChange={evt => this.modifications.count = Number.parseInt(evt.target.value)}/>
                </td>
                <td><button onClick={() => this.saveEdits()}>save</button></td>
                <td><button onClick={() => this.switchToMode(InventoryItemMode.NORMAL)}>discard</button></td>
            </tr>
        )
    }

    deleteMode() {
        return (
            <tr>
                <td>
                    Deletion Comment:
                </td>
                <td>
                    <input onChange={evt => this.deletion_comment = evt.target.value}/>
                </td>
                <td><button onClick={() => this.deleteItem()}>delete</button></td>
                <td><button onClick={() => this.switchToMode(InventoryItemMode.NORMAL)}>discard</button></td>
            </tr>
        )
    }

    switchToMode(mode: InventoryItemMode) {
        let state = {...this.state}
        state.mode = mode
        
        this.setState(state)
    }

    saveEdits() {
        let mods: MutableInventoryItemData = {
            name: "",
            count: 0
        }
        let modified = false

        if (this.modifications.name !== this.state.data.name) {
            mods.name = this.modifications.name
            modified = true
        }

        if (this.modifications.count !== this.state.data.count) {
            mods.count = this.modifications.count
            modified = true
        }

        if (modified) {
            fetch(`/inventory/item/existing/${this.state.data.id}`,
                { 
                    method: "PUT",
                    body: JSON.stringify(mods),
                    headers: { 'Content-Type': 'application/json' }
                }
            )
            .then((response: any) => {
                if (response.ok) {
                    let state = {...this.state}
                    state.mode = InventoryItemMode.NORMAL
                    state.data.name = this.modifications.name ?? state.data.name
                    state.data.count = this.modifications.count ?? state.data.count

                    this.setState(state)
                } else {
                    this.props.onErrorResponse(response)
                }
            })
        } else {
            this.switchToMode(InventoryItemMode.NORMAL)
        }
    }

    deleteItem() {
        fetch(`/inventory/item/existing/${this.state.data.id}`,
            {
                method: "DELETE",
                body: JSON.stringify({ comment: this.deletion_comment }),
                headers: { "Content-Type": "application/json" }
            }
        )
        .then((response: any) => {
            if (response.ok)
                this.props.onDelete(this.state.data.id)
            else
                this.props.onErrorResponse(response)
        })
    }
}


class DeletedInventoryTable extends React.Component {
    props: {
        entries: Array<DeletedInventoryItemData>,
        onReloadRequest: Function,
        onItemRestore: Function,
        onErrorResponse: Function
    }

    constructor(props: {
        entries: Array<DeletedInventoryItemData>,
        onReloadRequest: Function,
        onItemRestore: Function,
        onErrorResponse: Function
    }) {
        super(props)
    }

    render() {
        return (
            <React.StrictMode>
            <table className="table-data-any">
                <thead>
                    <tr>
                        <th>Item Name</th>
                        <th>Item Count</th>
                        <th>Deletion comment</th>
                        <th>
                            <button onClick={() => this.props.onReloadRequest()}>
                                reload
                            </button>
                        </th>
                    </tr>
                </thead>
                <tbody>
                    {
                        this.props.entries.map((item) => {
                            return <DeletedInventoryItem data={item} key={item.id}
                                onDelete={(id: number) => this.props.onItemRestore(id)}
                                onErrorResponse={(response: any) => this.props.onErrorResponse(response)}/>
                        })
                    }
                </tbody>
            </table>
            </React.StrictMode>
        )
    }
}

class DeletedInventoryItem extends React.Component {
    props: {data: DeletedInventoryItemData, onDelete: Function, onErrorResponse: Function}

    render() {
        return (
            <tr>
                <td>{this.props.data.name}</td>
                <td>{this.props.data.count}</td>
                <td>{this.props.data.comment}</td>
                <td><button onClick={() => this.restore()}>restore</button></td>
            </tr>
        )
    }

    restore() {
        fetch(`/inventory/item/existing/${this.props.data.id}`,
            {
                method: "PUT"
            }
        )
        .then((response: any) => {
            if (response.ok)
                this.props.onDelete(this.props.data.id)
            else
                this.props.onErrorResponse(response)
        })
    }
}


ReactDOM.render(<App />, document.getElementById("app"))
