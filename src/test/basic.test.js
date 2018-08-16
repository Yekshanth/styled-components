// @flow
import React, { Component, StrictMode } from 'react'
import { mount } from 'enzyme'
import TestRenderer from 'react-test-renderer'

import { resetStyled, expectCSSMatches } from './utils'

let styled

describe('basic', () => {
  /**
   * Make sure the setup is the same for every test
   */
  beforeEach(() => {
    styled = resetStyled()
  })

  it('should not throw an error when called with a valid element', () => {
    expect(() => styled.div``).not.toThrowError()

    const FunctionalComponent = () => <div />
    class ClassComponent extends Component<*, *> {
      render() {
        return <div />
      }
    }
    const validComps = ['div', FunctionalComponent, ClassComponent]
    validComps.forEach(comp => {
      expect(() => {
        const Comp = styled(comp)
        mount(<Comp />)
      }).not.toThrowError()
    })
  })

  it('should throw a meaningful error when called with an invalid element', () => {
    const FunctionalComponent = () => <div />
    class ClassComponent extends Component<*, *> {
      render() {
        return <div />
      }
    }
    const invalidComps = [
      undefined,
      null,
      123,
      [],
      <div />,
      <FunctionalComponent />,
      <ClassComponent />,
    ]
    invalidComps.forEach(comp => {
      expect(() => {
        // $FlowInvalidInputTest
        const Comp = styled(comp)
        mount(<Comp />)
        // $FlowInvalidInputTest
      }).toThrow(`Cannot create styled-component for component: ${comp}`)
    })
  })

  it('should not inject anything by default', () => {
    styled.div``
    expectCSSMatches('')
  })

  it('should inject component class when rendered even if no styles are passed', () => {
    const Comp = styled.div``
    mount(<Comp />)
    expectCSSMatches('.sc-a {}')
  })

  it('should inject styles', () => {
    const Comp = styled.div`
      color: blue;
    `
    mount(<Comp />)
    expectCSSMatches('.sc-a { } .b { color:blue; }')
  })

  it("should inject only once for a styled component, no matter how often it's mounted", () => {
    const Comp = styled.div`
      color: blue;
    `
    mount(<Comp />)
    mount(<Comp />)
    expectCSSMatches('.sc-a {} .b { color:blue; }')
  })

  it('Should have the correct styled(component) displayName', () => {
    const CompWithoutName = () => () => <div />

    const StyledTag = styled.div``
    expect(StyledTag.displayName).toBe('styled.div')

    const CompWithName = () => <div />
    CompWithName.displayName = null
    const StyledCompWithName = styled(CompWithName)``
    expect(StyledCompWithName.displayName).toBe('Styled(CompWithName)')

    const CompWithDisplayName = CompWithoutName()
    CompWithDisplayName.displayName = 'displayName'
    const StyledCompWithDisplayName = styled(CompWithDisplayName)``
    expect(StyledCompWithDisplayName.displayName).toBe('Styled(displayName)')

    const CompWithBoth = () => <div />
    CompWithBoth.displayName = 'displayName'
    const StyledCompWithBoth = styled(CompWithBoth)``
    expect(StyledCompWithBoth.displayName).toBe('Styled(displayName)')

    const CompWithNothing = CompWithoutName()
    CompWithNothing.displayName = null
    const StyledCompWithNothing = styled(CompWithNothing)``
    expect(StyledCompWithNothing.displayName).toBe('Styled(Component)')
  })

  it('should allow you to pass in style objects', () => {
    const Comp = styled.div({
      color: 'blue',
    })
    mount(<Comp />)
    expectCSSMatches('.sc-a {} .b { color:blue; }')
  })

  it('should allow you to pass in a function returning a style object', () => {
    const Comp = styled.div(({ color }) => ({
      color,
    }))
    mount(<Comp color="blue" />)
    expectCSSMatches('.sc-a {} .b { color:blue; }')
  })

  describe('jsdom tests', () => {
    it('should pass the ref to the component', () => {
      const Comp = styled.div``

      class Wrapper extends Component<*, *> {
        testRef: any = React.createRef()

        render() {
          return <Comp ref={this.testRef} />
        }
      }

      const wrapper = mount(<Wrapper />)
      const component = wrapper.find(Comp).first()

      expect(wrapper.instance().testRef.value).toBe(component.getDOMNode())
      expect(component.find('div').prop('ref')).toBeFalsy()
    })

    class InnerComponent extends Component<*, *> {
      render() {
        return null
      }
    }

    it('should pass the full className to the wrapped child', () => {
      const OuterComponent = styled(InnerComponent)``

      class Wrapper extends Component<*, *> {
        render() {
          return <OuterComponent className="test" />
        }
      }

      const wrapper = mount(<Wrapper />)
      expect(wrapper.find(InnerComponent).prop('className')).toBe('test sc-a b')
    })

    it('should pass the ref to the wrapped styled component', () => {
      const InnerComponent = styled.div``
      const OuterComponent = styled(InnerComponent)``

      class Wrapper extends Component<*, *> {
        testRef: any = React.createRef()

        render() {
          return <OuterComponent ref={this.testRef} />
        }
      }

      const wrapper = mount(<Wrapper />)
      const innerComponent = wrapper.find(InnerComponent).first()
      const outerComponent = wrapper.find(OuterComponent).first()
      const wrapperNode = wrapper.instance()

      expect(wrapperNode.testRef.value).toBe(innerComponent.getDOMNode())
      expect(innerComponent.prop('ref')).toBe(wrapperNode.ref)
    })

    it('should respect the order of StyledComponent creation for CSS ordering', () => {
      const FirstComponent = styled.div`
        color: red;
      `
      const SecondComponent = styled.div`
        color: blue;
      `

      // NOTE: We're mounting second before first and check if we're breaking their order
      mount(<SecondComponent />)
      mount(<FirstComponent />)

      expectCSSMatches('.sc-a {} .d { color:red; } .sc-b {} .c { color:blue; }')
    })

    it('handle media at-rules inside style rules', () => {
      const Comp = styled.div`
        > * {
          @media (min-width: 500px) {
            color: pink;
          }
        }
      `

      mount(<Comp />)
      expectCSSMatches(
        '.sc-a{ } @media (min-width:500px){ .b > *{ color:pink; } } '
      )
    })

    it('should hoist non-react static properties', () => {
      const InnerComponent = styled.div``
      InnerComponent.foo = 'bar'

      const OuterComponent = styled(InnerComponent)``

      expect(OuterComponent).toHaveProperty('foo', 'bar')
    })

    it('should not hoist styled component statics', () => {
      const InnerComponent = styled.div``
      const OuterComponent = styled(InnerComponent)``

      expect(OuterComponent.styledComponentId).not.toBe(
        InnerComponent.styledComponentId
      )

      expect(OuterComponent.componentStyle).not.toEqual(
        InnerComponent.componentStyle
      )
    })

    it('generates unique classnames when not using babel', () => {
      const Named1 = styled.div.withConfig({ displayName: 'Name' })`
        color: blue;
      `

      const Named2 = styled.div.withConfig({ displayName: 'Name' })`
        color: red;
      `

      expect(Named1.styledComponentId).not.toBe(Named2.styledComponentId)
    })

    it('honors a passed componentId', () => {
      const Named1 = styled.div.withConfig({
        componentId: 'foo',
        displayName: 'Name',
      })`
        color: blue;
      `

      const Named2 = styled.div.withConfig({
        componentId: 'bar',
        displayName: 'Name',
      })`
        color: red;
      `

      expect(Named1.styledComponentId).toBe('Name-foo')
      expect(Named2.styledComponentId).toBe('Name-bar')
    })

    it('should work in StrictMode without warnings', () => {
      const spy = jest.spyOn(console, 'error').mockImplementation(() => {})
      const Comp = styled.div``

      TestRenderer.create(
        <StrictMode>
          <Comp />
        </StrictMode>
      )

      expect(spy).not.toHaveBeenCalled()
    })
  })
})
