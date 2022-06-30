/**
 * @license
 * Copyright Google LLC All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

import {RElement} from '@angular/core/src/render3/interfaces/renderer_dom';

import {Component, Injector, Input, NgModuleRef, Output, RendererType2, ViewEncapsulation} from '../../src/core';
import {ComponentFactory} from '../../src/linker/component_factory';
import {Renderer2, RendererFactory2} from '../../src/render/api';
import {injectComponentFactoryResolver} from '../../src/render3/component_ref';
import {Sanitizer} from '../../src/sanitization/sanitizer';

import {MockRendererFactory} from './instructions/mock_renderer_factory';

const THROWING_RENDERER_FACTOR2_PROVIDER = {
  provide: RendererFactory2,
  useValue: {
    createRenderer: () => {
      throw new Error('Incorrect injector for Renderer2');
    }
  }
};

describe('ComponentFactory', () => {
  const cfr = injectComponentFactoryResolver();

  describe('constructor()', () => {
    it('should correctly populate default properties', () => {
      @Component({
        selector: 'test[foo], bar',
        standalone: true,
        template: '',
      })
      class TestComponent {
      }

      const cf = cfr.resolveComponentFactory(TestComponent);

      expect(cf.selector).toBe('test[foo],bar');
      expect(cf.componentType).toBe(TestComponent);
      expect(cf.ngContentSelectors).toEqual([]);
      expect(cf.inputs).toEqual([]);
      expect(cf.outputs).toEqual([]);
    });

    it('should correctly populate defined properties', () => {
      @Component({
        selector: 'test[foo], bar',
        standalone: true,
        template: `
          <ng-content></ng-content>
          <ng-content select="a"></ng-content>
          <ng-content select="b"></ng-content>
        `,
      })
      class TestComponent {
        @Input() in1: unknown;

        @Input('input-attr-2') in2: unknown;

        @Output() out1: unknown;

        @Output('output-attr-2') out2: unknown;
      }

      const cf = cfr.resolveComponentFactory(TestComponent);

      expect(cf.componentType).toBe(TestComponent);
      expect(cf.ngContentSelectors).toEqual(['*', 'a', 'b']);
      expect(cf.selector).toBe('test[foo],bar');

      expect(cf.inputs).toEqual([
        {propName: 'in1', templateName: 'in1'},
        {propName: 'in2', templateName: 'input-attr-2'},
      ]);
      expect(cf.outputs).toEqual([
        {propName: 'out1', templateName: 'out1'},
        {propName: 'out2', templateName: 'output-attr-2'},
      ]);
    });
  });

  describe('create()', () => {
    let createRenderer2Spy: jasmine.Spy;
    let cf: ComponentFactory<any>;

    beforeEach(() => {
      createRenderer2Spy =
          jasmine.createSpy('RendererFactory2#createRenderer').and.returnValue(document);

      @Component({
        selector: 'test',
        template: '...',
        host: {
          'class': 'HOST_COMPONENT',
        },
        encapsulation: ViewEncapsulation.None
      })
      class TestComponent {
      }

      cf = cfr.resolveComponentFactory(TestComponent);
    });

    describe('(when `ngModuleRef` is not provided)', () => {
      it('should retrieve `RendererFactory2` from the specified injector', () => {
        const injector = Injector.create([
          {provide: RendererFactory2, useValue: {createRenderer: createRenderer2Spy}},
        ]);

        cf.create(injector);

        expect(createRenderer2Spy).toHaveBeenCalled();
      });

      it('should retrieve `Sanitizer` from the specified injector', () => {
        const sanitizerFactorySpy = jasmine.createSpy('sanitizerFactory').and.returnValue({});
        const injector = Injector.create([
          {provide: RendererFactory2, useValue: {createRenderer: createRenderer2Spy}},
          {provide: Sanitizer, useFactory: sanitizerFactorySpy, deps: []},
        ]);

        cf.create(injector);

        expect(sanitizerFactorySpy).toHaveBeenCalled();
      });
    });

    describe('(when `ngModuleRef` is provided)', () => {
      it('should retrieve `RendererFactory2` from the specified injector first', () => {
        const injector = Injector.create([
          {provide: RendererFactory2, useValue: {createRenderer: createRenderer2Spy}},
        ]);
        const mInjector = Injector.create([THROWING_RENDERER_FACTOR2_PROVIDER]);

        cf.create(injector, undefined, undefined, {injector: mInjector} as NgModuleRef<any>);

        expect(createRenderer2Spy).toHaveBeenCalled();
      });

      it('should retrieve `RendererFactory2` from the `ngModuleRef` if not provided by the injector',
         () => {
           const injector = Injector.create([]);
           const mInjector = Injector.create([
             {provide: RendererFactory2, useValue: {createRenderer: createRenderer2Spy}},
           ]);

           cf.create(injector, undefined, undefined, {injector: mInjector} as NgModuleRef<any>);

           expect(createRenderer2Spy).toHaveBeenCalled();
         });

      it('should retrieve `Sanitizer` from the specified injector first', () => {
        const iSanitizerFactorySpy =
            jasmine.createSpy('Injector#sanitizerFactory').and.returnValue({});
        const injector = Injector.create([
          {provide: Sanitizer, useFactory: iSanitizerFactorySpy, deps: []},
        ]);

        const mSanitizerFactorySpy =
            jasmine.createSpy('NgModuleRef#sanitizerFactory').and.returnValue({});
        const mInjector = Injector.create([
          {provide: RendererFactory2, useValue: {createRenderer: createRenderer2Spy}},
          {provide: Sanitizer, useFactory: mSanitizerFactorySpy, deps: []},
        ]);

        cf.create(injector, undefined, undefined, {injector: mInjector} as NgModuleRef<any>);

        expect(iSanitizerFactorySpy).toHaveBeenCalled();
        expect(mSanitizerFactorySpy).not.toHaveBeenCalled();
      });

      it('should retrieve `Sanitizer` from the `ngModuleRef` if not provided by the injector',
         () => {
           const injector = Injector.create([]);

           const mSanitizerFactorySpy =
               jasmine.createSpy('NgModuleRef#sanitizerFactory').and.returnValue({});
           const mInjector = Injector.create([
             {provide: RendererFactory2, useValue: {createRenderer: createRenderer2Spy}},
             {provide: Sanitizer, useFactory: mSanitizerFactorySpy, deps: []},
           ]);


           cf.create(injector, undefined, undefined, {injector: mInjector} as NgModuleRef<any>);

           expect(mSanitizerFactorySpy).toHaveBeenCalled();
         });
    });

    describe('(when the factory is bound to a `ngModuleRef`)', () => {
      it('should retrieve `RendererFactory2` from the specified injector first', () => {
        const injector = Injector.create([
          {provide: RendererFactory2, useValue: {createRenderer: createRenderer2Spy}},
        ]);
        (cf as any).ngModule = {injector: Injector.create([THROWING_RENDERER_FACTOR2_PROVIDER])};

        cf.create(injector);

        expect(createRenderer2Spy).toHaveBeenCalled();
      });

      it('should retrieve `RendererFactory2` from the `ngModuleRef` if not provided by the injector',
         () => {
           const injector = Injector.create([]);
           (cf as any).ngModule = {
             injector: Injector.create([
               {provide: RendererFactory2, useValue: {createRenderer: createRenderer2Spy}},
             ])
           };

           cf.create(injector);

           expect(createRenderer2Spy).toHaveBeenCalled();
         });

      it('should retrieve `Sanitizer` from the specified injector first', () => {
        const iSanitizerFactorySpy =
            jasmine.createSpy('Injector#sanitizerFactory').and.returnValue({});
        const injector = Injector.create([
          {provide: RendererFactory2, useValue: {createRenderer: createRenderer2Spy}},
          {provide: Sanitizer, useFactory: iSanitizerFactorySpy, deps: []},
        ]);

        const mSanitizerFactorySpy =
            jasmine.createSpy('NgModuleRef#sanitizerFactory').and.returnValue({});
        (cf as any).ngModule = {
          injector: Injector.create([
            {provide: Sanitizer, useFactory: mSanitizerFactorySpy, deps: []},
          ])
        };

        cf.create(injector);

        expect(iSanitizerFactorySpy).toHaveBeenCalled();
        expect(mSanitizerFactorySpy).not.toHaveBeenCalled();
      });

      it('should retrieve `Sanitizer` from the `ngModuleRef` if not provided by the injector',
         () => {
           const injector = Injector.create([]);

           const mSanitizerFactorySpy =
               jasmine.createSpy('NgModuleRef#sanitizerFactory').and.returnValue({});
           (cf as any).ngModule = {
             injector: Injector.create([
               {provide: RendererFactory2, useValue: {createRenderer: createRenderer2Spy}},
               {provide: Sanitizer, useFactory: mSanitizerFactorySpy, deps: []},
             ])
           };


           cf.create(injector);

           expect(mSanitizerFactorySpy).toHaveBeenCalled();
         });
    });

    it('should ensure that rendererFactory is called after initial styling is set', () => {
      class TestMockRendererFactory extends MockRendererFactory {
        override createRenderer(hostElement: RElement|null, rendererType: RendererType2|null):
            Renderer2 {
          if (hostElement) {
            hostElement.classList.add('HOST_RENDERER');
          }
          return super.createRenderer(hostElement, rendererType);
        }
      }

      const injector = Injector.create([
        {provide: RendererFactory2, useFactory: () => new TestMockRendererFactory(), deps: []},
      ]);

      const hostNode = document.createElement('div');
      const componentRef = cf.create(injector, undefined, hostNode);
      expect(hostNode.className).toEqual('HOST_COMPONENT HOST_RENDERER');
    });
  });
});
